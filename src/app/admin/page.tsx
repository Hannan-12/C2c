import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, BOOKING_STATUSES, SERVICE_TYPES } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";
import { STATUS_LABEL, SERVICE_LABEL, type BookingStatus } from "@/lib/booking-status";
import { formatFare, formatPickup } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 25;

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

  const [{ openCount }] = await db
    .select({ openCount: count() })
    .from(bookings)
    .where(inArray(bookings.status, OPEN_STATUSES));

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = filters.length > 0;

  return (
    <>
      <h1 className="display text-2xl sm:text-3xl mb-6">Bookings</h1>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <Stat label="New today" value={todayCount} />
        <Stat label="Awaiting action" value={pendingCount} accent />
        <Stat label="Open bookings" value={openCount} />
        <Stat label="Completed this week" value={weekCount} />
      </div>

      <form className="card mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5 items-end">
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

      {rows.length === 0 ? (
        <div className="card text-center py-12">
          <p className="font-semibold mb-1">No bookings match</p>
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
                    {row.fareEstimate ? formatFare(Number(row.fareEstimate)) : "—"}
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
