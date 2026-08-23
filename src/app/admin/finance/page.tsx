import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, gte, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingAssignments, drivers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";
import { formatFare, formatPickup } from "@/lib/format";
import {
  COMMISSION_PERCENT,
  DRIVER_PERCENT,
  isEarned,
  splitFare,
} from "@/lib/commission";
import { settleDriverPayout } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Money",
  robots: { index: false, follow: false },
};

/**
 * Periods an operator actually asks about. "All time" is last because it is
 * the least useful — the question is nearly always about the current week or
 * what is owed right now.
 */
const PERIODS = {
  week: "This week",
  month: "This month",
  all: "All time",
} as const;
type Period = keyof typeof PERIODS;

function since(period: Period): Date | null {
  if (period === "all") return null;

  const from = new Date();
  from.setHours(0, 0, 0, 0);

  if (period === "week") {
    // Monday, not Sunday: the working week here starts on Monday and a driver
    // asking "what did I earn this week" means since Monday.
    const day = (from.getDay() + 6) % 7;
    from.setDate(from.getDate() - day);
  } else {
    from.setDate(1);
  }

  return from;
}

export default async function FinancePage({ searchParams }: PageProps<"/admin/finance">) {
  await requireAdmin();

  const params = await searchParams;
  const period: Period =
    typeof params.period === "string" && params.period in PERIODS
      ? (params.period as Period)
      : "week";

  const from = since(period);

  /**
   * Completed trips only, joined to whoever drove them. A booking with no
   * driver has earned nobody anything, and one still in progress is not money
   * yet — both would inflate a figure the client may be paying out against.
   */
  const rows = await db
    .select({
      bookingId: bookings.id,
      referenceCode: bookings.referenceCode,
      status: bookings.status,
      pickupDatetime: bookings.pickupDatetime,
      paymentMethod: bookings.paymentMethod,
      fareEstimate: bookings.fareEstimate,
      agreedFare: bookings.agreedFare,
      amountPaid: bookings.amountPaid,
      amountRefunded: bookings.amountRefunded,
      driverId: drivers.id,
      driverName: drivers.name,
      driverWhatsapp: drivers.whatsappNumber,
      settledAt: bookingAssignments.payoutSettledAt,
      settledAmount: bookingAssignments.payoutAmount,
    })
    .from(bookings)
    .innerJoin(bookingAssignments, eq(bookingAssignments.bookingId, bookings.id))
    .innerJoin(drivers, eq(drivers.id, bookingAssignments.driverId))
    .where(
      and(
        eq(bookings.status, "completed"),
        ...(from ? [gte(bookings.pickupDatetime, from)] : []),
      ),
    );

  const earned = rows.filter(isEarned);

  const totals = earned.reduce(
    (acc, row) => {
      const split = splitFare(row);
      acc.net += split.net;
      acc.company += split.company;
      acc.driver += split.driver;
      if (row.paymentMethod === "cash") acc.cash += split.net;
      else acc.card += split.net;
      return acc;
    },
    { net: 0, company: 0, driver: 0, cash: 0, card: 0 },
  );

  /**
   * Per driver, and only what is still outstanding. A settled trip keeps the
   * figure it was settled at, so correcting a fare afterwards cannot quietly
   * reopen a payment already handed over.
   */
  const byDriver = new Map<
    string,
    {
      name: string;
      whatsapp: string;
      trips: number;
      driverShare: number;
      companyShare: number;
      /** Positive: we owe them. Negative: they owe us. */
      outstanding: number;
      unsettledTrips: number;
    }
  >();

  for (const row of earned) {
    const split = splitFare(row);
    const entry = byDriver.get(row.driverId) ?? {
      name: row.driverName,
      whatsapp: row.driverWhatsapp,
      trips: 0,
      driverShare: 0,
      companyShare: 0,
      outstanding: 0,
      unsettledTrips: 0,
    };

    entry.trips += 1;
    entry.driverShare += split.driver;
    entry.companyShare += split.company;

    if (!row.settledAt) {
      entry.outstanding += split.balance;
      entry.unsettledTrips += 1;
    }

    byDriver.set(row.driverId, entry);
  }

  const drivers_ = [...byDriver.entries()].sort(
    (a, b) => Math.abs(b[1].outstanding) - Math.abs(a[1].outstanding),
  );

  return (
    <>
      <h1 className="display text-2xl sm:text-3xl mb-1">Money</h1>
      <p className="text-ink-muted mb-6 max-w-2xl">
        Completed trips only, split {COMMISSION_PERCENT}/{DRIVER_PERCENT} between
        the business and the driver. A trip that was cancelled, refunded or never
        driven earns nobody anything.
      </p>

      <nav aria-label="Period" className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(PERIODS) as Period[]).map((p) => (
          <Link
            key={p}
            href={`/admin/finance?period=${p}`}
            aria-current={p === period ? "page" : undefined}
            className={`rounded-field border px-3.5 py-2 text-sm transition-colors ${
              p === period
                ? "border-accent bg-accent-soft font-semibold text-accent-strong"
                : "border-line hover:bg-field"
            }`}
          >
            {PERIODS[p]}
          </Link>
        ))}
      </nav>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <Figure label="Collected" value={formatFare(totals.net)} note={`${earned.length} trips`} />
        <Figure
          label={`Your ${COMMISSION_PERCENT}%`}
          value={formatFare(totals.company)}
          accent
        />
        <Figure label={`Drivers' ${DRIVER_PERCENT}%`} value={formatFare(totals.driver)} />
        <Figure
          label="Card / cash"
          value={`${formatFare(totals.card)} · ${formatFare(totals.cash)}`}
          note="How it was collected"
        />
      </div>

      <h2 className="display text-xl mb-1">By driver</h2>
      <p className="text-ink-muted text-sm mb-4 max-w-2xl">
        Card trips leave money with us to pay out; cash trips leave it with the
        driver, so the commission comes back. The figure below nets the two.
      </p>

      {drivers_.length === 0 ? (
        <div className="card text-center py-12">
          <p className="font-semibold mb-1">Nothing to settle</p>
          <p className="text-sm text-ink-muted">
            No completed trips with an assigned driver in this period.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {drivers_.map(([driverId, d]) => (
            <section key={driverId} className="card">
              <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
                <h3 className="font-semibold">
                  {d.name}
                  <span className="ml-2 text-xs font-normal text-ink-faint">
                    {d.trips} {d.trips === 1 ? "trip" : "trips"}
                  </span>
                </h3>
                <p className="text-sm text-ink-muted">
                  <span className="tnum font-mono">{formatFare(d.driverShare)}</span>{" "}
                  earned ·{" "}
                  <span className="tnum font-mono">{formatFare(d.companyShare)}</span>{" "}
                  commission
                </p>
              </header>

              {d.unsettledTrips === 0 ? (
                <p className="text-sm text-ink-faint">
                  All settled for this period.
                </p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm">
                    {d.outstanding >= 0 ? (
                      <>
                        <strong className="text-green-800">
                          Pay {formatFare(d.outstanding)}
                        </strong>{" "}
                        <span className="text-ink-muted">
                          across {d.unsettledTrips} unsettled{" "}
                          {d.unsettledTrips === 1 ? "trip" : "trips"}
                        </span>
                      </>
                    ) : (
                      <>
                        <strong className="text-amber-700">
                          Collect {formatFare(Math.abs(d.outstanding))}
                        </strong>{" "}
                        <span className="text-ink-muted">
                          from {d.unsettledTrips} cash{" "}
                          {d.unsettledTrips === 1 ? "trip" : "trips"}
                        </span>
                      </>
                    )}
                  </p>

                  {/*
                    Settling freezes each trip's figure as it stands now. A fare
                    corrected later must not reopen a payment already handed
                    over in cash.
                  */}
                  <form action={settleDriverPayout}>
                    <input type="hidden" name="driverId" value={driverId} />
                    <input type="hidden" name="period" value={period} />
                    <button type="submit" className="btn-secondary">
                      Mark settled
                    </button>
                  </form>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-ink-faint max-w-2xl">
        Stripe&apos;s processing fee is not deducted before the split — the{" "}
        {COMMISSION_PERCENT}% is taken from the fare charged, so the fee comes
        out of the business&apos;s share. That is also the version a driver can
        check against the fare they were told.
      </p>
    </>
  );
}

function Figure({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note?: string;
  accent?: boolean;
}) {
  return (
    <div className={`card ${accent ? "border-accent bg-accent-soft" : ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-faint mb-1">
        {label}
      </p>
      <p className="tnum font-mono text-xl font-bold">{value}</p>
      {note && <p className="mt-0.5 text-xs text-ink-faint">{note}</p>}
    </div>
  );
}
