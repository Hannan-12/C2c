import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, gt, gte, inArray, like, lt, or, sum } from "drizzle-orm";
import { db } from "@/db";
import {
  bookings,
  BOOKING_STATUSES,
  SERVICE_TYPES,
  type PaymentMethod,
  type PaymentStatus,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";
import { isValidReferenceCode, normaliseReferenceCode } from "@/lib/reference-code";
import { phoneSuffix } from "@/lib/search";
import { redirect } from "next/navigation";
import { STATUS_LABEL, SERVICE_LABEL, type BookingStatus } from "@/lib/booking-status";
import { formatFare, formatPickup } from "@/lib/format";
import { payableFare } from "@/lib/fare";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;

/**
 * Payment states as an operator thinks about them, which is not how they are
 * stored. `not_required` means cash — not a problem, just a different way of
 * being settled — and a partial refund leaves a booking `paid` with money
 * returned, so "refunded" has to look at the amount rather than the status.
 */
const PAYMENT_FILTERS = ["paid", "unpaid", "refunded", "cash"] as const;
type PaymentFilter = (typeof PAYMENT_FILTERS)[number];

const PAYMENT_FILTER_LABEL: Record<PaymentFilter, string> = {
  paid: "Paid",
  unpaid: "Awaiting payment",
  refunded: "Refunded",
  cash: "Cash on the day",
};

/** Statuses that still need the operator to do something. */
const OPEN_STATUSES: BookingStatus[] = [
  "requested",
  "awaiting_confirmation",
  "confirmed",
  "assigned",
  "en_route",
];

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();

  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";
  const service = typeof params.service === "string" ? params.service : "";
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const payment = typeof params.payment === "string" ? params.payment : "";

  /**
   * A complete reference opens its booking rather than returning a list of
   * one. Pasting a code out of WhatsApp is the single most common thing done
   * here, and an extra click on a result you already identified is friction
   * with nothing to show for it.
   */
  if (q) {
    const code = normaliseReferenceCode(q);
    if (isValidReferenceCode(code)) {
      const [exact] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.referenceCode, code))
        .limit(1);

      if (exact) redirect(`/admin/bookings/${exact.id}`);
    }
  }

  const filters = [];
  if (BOOKING_STATUSES.includes(status as never)) {
    filters.push(eq(bookings.status, status as BookingStatus));
  }
  if (SERVICE_TYPES.includes(service as never)) {
    filters.push(eq(bookings.serviceType, service as (typeof SERVICE_TYPES)[number]));
  }
  if (from) filters.push(gte(bookings.pickupDatetime, new Date(`${from}T00:00:00`)));
  if (to) {
    // Exclusive upper bound on the next day, so the whole end date is included.
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    filters.push(lt(bookings.pickupDatetime, end));
  }

  if (PAYMENT_FILTERS.includes(payment as never)) {
    const clause: Record<PaymentFilter, ReturnType<typeof and>> = {
      paid: eq(bookings.paymentStatus, "paid"),
      // Owes money and has not paid it. A cash booking owes nothing in
      // advance, so it does not belong here however unpaid it looks.
      unpaid: and(
        eq(bookings.paymentMethod, "card"),
        inArray(bookings.paymentStatus, ["pending", "not_required"]),
      ),
      // Status alone would miss a partial refund, which stays `paid`.
      refunded: or(
        eq(bookings.paymentStatus, "refunded"),
        gt(bookings.amountRefunded, "0"),
      ),
      cash: eq(bookings.paymentMethod, "cash"),
    };

    filters.push(clause[payment as PaymentFilter]!);
  }

  if (q) {
    /**
     * Reference, name and phone in one box. Anything else — a pickup address,
     * a flight number — is a different search with different ergonomics, and
     * widening this one would make the common case slower without making the
     * rare one good.
     *
     * Leading-wildcard LIKE cannot use an index. At this table's size that is
     * irrelevant; if the booking count ever makes it matter, the fix is a
     * fulltext index rather than a narrower search.
     */
    const term = `%${q}%`;
    const suffix = phoneSuffix(q);

    const matches = [
      like(bookings.referenceCode, `%${q.toUpperCase()}%`),
      like(bookings.customerName, term),
      ...(suffix ? [like(bookings.customerWhatsapp, `%${suffix}`)] : []),
    ];

    filters.push(or(...matches)!);
  }

  const where = filters.length ? and(...filters) : undefined;

  const today = startOfToday();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [rows, [{ total }], [{ todayCount }], [{ pendingCount }], [{ weekCount }]] =
    await Promise.all([
      db
        .select({
          id: bookings.id,
          referenceCode: bookings.referenceCode,
          customerName: bookings.customerName,
          serviceType: bookings.serviceType,
          pickupLocation: bookings.pickupLocation,
          dropoffLocation: bookings.dropoffLocation,
          pickupDatetime: bookings.pickupDatetime,
          status: bookings.status,
          fareEstimate: bookings.fareEstimate,
          agreedFare: bookings.agreedFare,
          paymentMethod: bookings.paymentMethod,
          paymentStatus: bookings.paymentStatus,
          amountPaid: bookings.amountPaid,
          amountRefunded: bookings.amountRefunded,
        })
        .from(bookings)
        .where(where)
        .orderBy(desc(bookings.createdAt))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),

      db.select({ total: count() }).from(bookings).where(where),

      db
        .select({ todayCount: count() })
        .from(bookings)
        .where(gte(bookings.createdAt, today)),

      db
        .select({ pendingCount: count() })
        .from(bookings)
        .where(
          inArray(bookings.status, [
            "requested",
            "awaiting_confirmation",
            "confirmed",
          ]),
        ),

      db
        .select({ weekCount: count() })
        .from(bookings)
        .where(
          and(eq(bookings.status, "completed"), gte(bookings.pickupDatetime, weekAgo)),
        ),
    ]);

  /**
   * Totals across the filter, not the page. The date filters only become
   * useful for "what did we take this week" if the figure covers the whole
   * result rather than the twenty-five rows currently visible.
   *
   * Net of refunds, because gross takings that ignore money given back are a
   * number nobody can act on.
   */
  const [totals] = await db
    .select({
      paid: sum(bookings.amountPaid),
      refunded: sum(bookings.amountRefunded),
    })
    .from(bookings)
    .where(where);

  const taken = Number(totals?.paid ?? 0) - Number(totals?.refunded ?? 0);

  const [{ openCount }] = await db
    .select({ openCount: count() })
    .from(bookings)
    .where(inArray(bookings.status, OPEN_STATUSES));

  /**
   * The applied filters, minus pagination — an export of "page 2" is not a
   * thing anyone wants, and the file should cover everything the filters
   * select rather than the rows currently visible.
   */
  const exportQuery = new URLSearchParams(
    Object.entries({ status, service, payment, from, to, q }).filter(
      ([, v]) => typeof v === "string" && v !== "",
    ) as [string, string][],
  ).toString();

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = filters.length > 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="display text-2xl sm:text-3xl">Bookings</h1>
        <Link href="/admin/bookings/new" className="btn-primary">
          Booking over the phone
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <Stat label="New today" value={todayCount} />
        <Stat label="Awaiting action" value={pendingCount} accent />
        <Stat label="Open bookings" value={openCount} />
        <Stat label="Completed this week" value={weekCount} />
      </div>

      <form className="card mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6 items-end">
        <div className="sm:col-span-2 xl:col-span-6">
          <label className="field-label" htmlFor="q">
            Search by reference, name or number
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="C2C-7K4M2XQP · Aisha · 058 965 5634"
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="field-input">
            <option value="">All statuses</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="service">
            Service
          </label>
          <select
            id="service"
            name="service"
            defaultValue={service}
            className="field-input"
          >
            <option value="">All services</option>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {SERVICE_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="payment">
            Payment
          </label>
          <select
            id="payment"
            name="payment"
            defaultValue={payment}
            className="field-input"
          >
            <option value="">Any payment state</option>
            {PAYMENT_FILTERS.map((f) => (
              <option key={f} value={f}>
                {PAYMENT_FILTER_LABEL[f]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="from">
            Pickup from
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="to">
            Pickup to
          </label>
          <input id="to" name="to" type="date" defaultValue={to} className="field-input" />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1">
            Filter
          </button>
          {filtered && (
            <Link href="/admin" className="btn-secondary">
              Clear
            </Link>
          )}
        </div>
      </form>

      {/*
        Outside the filter form: a link, not a second submit button, so it
        carries the filters that are actually applied rather than whatever is
        currently typed into the boxes.
      */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {total} {total === 1 ? "booking" : "bookings"}
          {filtered ? " matching these filters" : ""}
        </p>
        <a
          href={`/api/admin/export${exportQuery ? `?${exportQuery}` : ""}`}
          className="btn-secondary"
          download
        >
          Download CSV
        </a>
      </div>

      {/*
        Tied to the filter above rather than shown as a headline stat: it is
        the answer to "what did this selection take", and detached from the
        selection it would read as an all-time total and be wrong.
      */}
      {rows.length > 0 && taken !== 0 && (
        <p className="mb-4 text-sm text-ink-muted">
          <span className="tnum font-mono font-semibold text-ink">
            {formatFare(taken)}
          </span>{" "}
          taken across {total} {total === 1 ? "booking" : "bookings"}
          {filtered ? " matching these filters" : ""}
          {Number(totals?.refunded ?? 0) > 0 && (
            <>
              , after{" "}
              <span className="tnum font-mono">
                {formatFare(Number(totals?.refunded ?? 0))}
              </span>{" "}
              refunded
            </>
          )}
          .
        </p>
      )}

      {rows.length === 0 ? (
        <div className="card text-center py-12">
          <p className="font-semibold mb-1">
            {q ? `Nothing matches “${q}”` : "No bookings match"}
          </p>
          <p className="text-sm text-ink-muted">
            {filtered
              ? "Try widening the filters."
              : "New booking requests will appear here as they come in."}
          </p>
        </div>
      ) : (
        <div className="card !p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-200">
            <caption className="sr-only">Booking requests, newest first</caption>
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-ink-faint border-b border-line">
                <th scope="col" className="text-left font-medium px-5 py-3">Reference</th>
                <th scope="col" className="text-left font-medium px-4 py-3">Customer</th>
                <th scope="col" className="text-left font-medium px-4 py-3">Route</th>
                <th scope="col" className="text-left font-medium px-4 py-3">Pickup</th>
                <th scope="col" className="text-right font-medium px-4 py-3">Fare</th>
                <th scope="col" className="text-left font-medium px-4 py-3">Payment</th>
                <th scope="col" className="text-left font-medium px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0 hover:bg-field/60">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/bookings/${row.id}`}
                      className="font-mono text-[13px] font-medium hover:text-accent-strong"
                    >
                      {row.referenceCode}
                    </Link>
                    <span className="block text-[11px] text-ink-faint mt-0.5">
                      {SERVICE_LABEL[row.serviceType] ?? row.serviceType}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">{row.customerName}</td>
                  <td className="px-4 py-3.5 text-ink-muted max-w-[260px] truncate">
                    {row.pickupLocation}
                    {row.dropoffLocation && (
                      <>
                        <span className="text-accent mx-1.5" aria-hidden>→</span>
                        {row.dropoffLocation}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {formatPickup(row.pickupDatetime)}
                  </td>
                  <td className="tnum px-4 py-3.5 text-right font-mono whitespace-nowrap">
                    {payableFare(row) !== null ? formatFare(payableFare(row)!) : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <PaymentPill booking={row} />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-3 mt-5">
          <PageLink page={page - 1} disabled={page <= 1} params={params}>
            Previous
          </PageLink>
          <span className="text-sm text-ink-muted">
            Page {page} of {pageCount}
          </span>
          <PageLink page={page + 1} disabled={page >= pageCount} params={params}>
            Next
          </PageLink>
        </nav>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className={`card ${accent && value > 0 ? "border-accent bg-accent-soft" : ""}`}>
      <p className="tnum text-2xl font-bold">{value}</p>
      <p className="text-sm text-ink-muted mt-0.5">{label}</p>
    </div>
  );
}


/**
 * Where a booking's money has got to.
 *
 * Carries a glyph as well as a colour, because "paid" and "awaiting payment"
 * are the two an operator scans for and red-green is exactly the pair a
 * colour-blind reader cannot separate. The glyph is decorative — the text
 * beside it already says which state it is.
 *
 * Cash is deliberately quiet. It is not a problem to be chased, just a booking
 * that settles with the driver, and giving it the same weight as an unpaid
 * card would make a full list of ordinary bookings look like a list of debts.
 */
function PaymentPill({
  booking,
}: {
  booking: {
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    amountPaid: string | null;
    amountRefunded: string | null;
  };
}) {
  const refunded = Number(booking.amountRefunded ?? 0);

  // A partial refund stays `paid` with money returned, so the amount decides
  // this, not the status.
  const [label, glyph, tone] =
    refunded > 0
      ? booking.paymentStatus === "refunded"
        ? (["Refunded", "\u21A9", "bg-accent-soft text-accent-strong border-accent"] as const)
        : (["Part refunded", "\u21A9", "bg-accent-soft text-accent-strong border-accent"] as const)
      : booking.paymentStatus === "paid"
        ? (["Paid", "\u2713", "bg-green-50 text-green-800 border-green-200"] as const)
        : booking.paymentMethod === "cash"
          ? (["Cash", "\u25CB", "bg-field text-ink-muted border-line"] as const)
          : (["Awaiting", "\u2022", "bg-red-50 text-red-700 border-red-200"] as const);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${tone}`}
    >
      <span aria-hidden>{glyph}</span>
      {label}
      {booking.paymentStatus === "paid" && booking.amountPaid && refunded === 0 && (
        <span className="tnum font-mono font-normal opacity-70">
          {formatFare(Number(booking.amountPaid))}
        </span>
      )}
    </span>
  );
}

export function StatusPill({ status }: { status: BookingStatus }) {
  const tone =
    status === "cancelled"
      ? "bg-red-50 text-red-700 border-red-200"
      : status === "completed"
        ? "bg-green-50 text-green-800 border-green-200"
        : status === "requested"
          ? "bg-accent-soft text-accent-strong border-accent"
          : "bg-field text-ink border-line";

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${tone}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function PageLink({
  page,
  disabled,
  params,
  children,
}: {
  page: number;
  disabled: boolean;
  params: Record<string, string | string[] | undefined>;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="text-sm text-ink-faint">{children}</span>;
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && key !== "page") search.set(key, value);
  }
  search.set("page", String(page));

  return (
    <Link href={`/admin?${search}`} className="text-sm font-medium hover:text-accent-strong">
      {children}
    </Link>
  );
}
