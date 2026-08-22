import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingAssignments, drivers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";
import { BRAND } from "@/lib/seo";
import {
  SERVICE_LABEL,
  STATUS_LABEL,
  VEHICLE_LABEL,
  type BookingStatus,
} from "@/lib/booking-status";
import {
  formatDistance,
  formatDuration,
  formatFare,
  formatPickup,
  whatsappLink,
} from "@/lib/format";
import { StatusPill } from "../../page";
import { assignDriver, unassignDriver, updateBookingStatus } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking detail",
  robots: { index: false, follow: false },
};

/** Which statuses the operator can move to from where they are. */
const NEXT_STATUSES: Record<BookingStatus, BookingStatus[]> = {
  requested: ["awaiting_confirmation", "confirmed", "cancelled"],
  awaiting_confirmation: ["confirmed", "cancelled"],
  confirmed: ["assigned", "cancelled"],
  assigned: ["en_route", "completed", "cancelled"],
  en_route: ["completed", "cancelled"],
  completed: [],
  cancelled: ["requested"],
};

/** Operator-facing wording. "not_required" means cash, which is not a problem. */
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  not_required: "Not applicable — cash",
  pending: "Awaiting payment",
  paid: "Paid",
  refunded: "Refunded",
};

export default async function BookingDetailPage({
  params,
}: PageProps<"/admin/bookings/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!booking) notFound();

  const [assignment] = await db
    .select({
      driverId: drivers.id,
      driverName: drivers.name,
      driverWhatsapp: drivers.whatsappNumber,
      driverVehicle: drivers.vehicleAssigned,
      notes: bookingAssignments.notes,
      assignedAt: bookingAssignments.assignedAt,
    })
    .from(bookingAssignments)
    .innerJoin(drivers, eq(drivers.id, bookingAssignments.driverId))
    .where(eq(bookingAssignments.bookingId, booking.id))
    .limit(1);

  const activeDrivers = await db
    .select({
      id: drivers.id,
      name: drivers.name,
      vehicleAssigned: drivers.vehicleAssigned,
    })
    .from(drivers)
    .where(eq(drivers.active, true))
    .orderBy(asc(drivers.name));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const trackingUrl = `${siteUrl}/track/${booking.referenceCode}`;
  const route = booking.dropoffLocation
    ? `${booking.pickupLocation} → ${booking.dropoffLocation}`
    : `${booking.pickupLocation} (${booking.durationHours ?? "?"}h hire)`;

  // Prefilled so the operator never retypes trip details into WhatsApp
  // (docs Section 8).
  const customerMessage = `Hi ${booking.customerName}, this is ${BRAND} about your booking ${booking.referenceCode} — ${route} on ${formatPickup(booking.pickupDatetime)}. Track it here: ${trackingUrl}`;
  const driverMessage = `Job ${booking.referenceCode}\nPickup: ${booking.pickupLocation}\n${booking.dropoffLocation ? `Dropoff: ${booking.dropoffLocation}\n` : ""}When: ${formatPickup(booking.pickupDatetime)}\nVehicle: ${VEHICLE_LABEL[booking.vehicleCategory]}\nPassengers: ${booking.passengerCount}, bags: ${booking.luggageCount}`;

  return (
    <>
      <Link href="/admin" className="text-sm text-ink-muted hover:text-ink mb-5 inline-block">
        ← All bookings
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="display text-2xl sm:text-3xl font-mono">
            {booking.referenceCode}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {SERVICE_LABEL[booking.serviceType]} · requested{" "}
            {formatPickup(booking.createdAt)}
          </p>
        </div>
        <StatusPill status={booking.status} />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="flex flex-col gap-4">
          <section className="card">
            <h2 className="font-semibold mb-4">Trip</h2>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3.5 text-sm">
              <Detail label="Pickup" value={booking.pickupLocation} />
              <Detail label="Dropoff" value={booking.dropoffLocation ?? undefined} />
              <Detail label="Pickup time" value={formatPickup(booking.pickupDatetime)} />
              <Detail
                label="Duration"
                value={booking.durationHours ? `${booking.durationHours} hours` : undefined}
              />
              <Detail label="Flight" value={booking.flightNumber ?? undefined} />
              <Detail label="Vehicle" value={VEHICLE_LABEL[booking.vehicleCategory]} />
              <Detail
                label="Passengers"
                value={`${booking.passengerCount} · ${booking.luggageCount} bags`}
              />
              <Detail
                label="Distance"
                value={
                  booking.distanceKm
                    ? [
                        formatDistance(Number(booking.distanceKm)),
                        booking.durationMin ? formatDuration(booking.durationMin) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : undefined
                }
              />
              <Detail
                label="Fare estimate"
                value={
                  booking.fareEstimate ? formatFare(Number(booking.fareEstimate)) : "Not calculated"
                }
              />
            </dl>
          </section>

          {/*
            Payment is its own section rather than another Detail row: an
            operator deciding whether to release a car needs to see at a glance
            whether the money arrived, and that answer should not be buried
            among the pickup address and the luggage count.
          */}
          <section className="card">
            <h2 className="font-semibold mb-4">Payment</h2>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3.5 text-sm">
              <Detail
                label="Method"
                value={booking.paymentMethod === "card" ? "Card (Stripe)" : "Cash to driver"}
              />
              <Detail label="Status" value={PAYMENT_STATUS_LABEL[booking.paymentStatus]} />
              <Detail
                label="Amount received"
                value={
                  booking.amountPaid ? formatFare(Number(booking.amountPaid)) : undefined
                }
              />
              <Detail
                label="Received at"
                value={booking.paidAt ? formatPickup(booking.paidAt) : undefined}
              />
              <Detail
                label="Refunded"
                value={
                  booking.amountRefunded
                    ? formatFare(Number(booking.amountRefunded))
                    : undefined
                }
              />
              <Detail
                label="Refunded at"
                value={booking.refundedAt ? formatPickup(booking.refundedAt) : undefined}
              />
              {/*
                The payment intent, not the session: it is the id Stripe's
                dashboard search and any refund or dispute are keyed on.
              */}
              <Detail
                label="Stripe reference"
                value={booking.stripePaymentIntentId ?? undefined}
              />
            </dl>

            {/*
              Refunds are issued in the Stripe dashboard, not here. Said out
              loud because an operator looking at a cancelled paid booking
              needs to know there is no button coming — and because the figures
              above only appear once Stripe tells us, so an empty "Refunded"
              row means the refund has not been sent, not that it failed.
            */}
            {booking.paymentStatus === "paid" && booking.stripePaymentIntentId && (
              <p className="mt-4 text-sm text-ink-muted">
                Refund from the Stripe dashboard, searching the reference above.
                It appears here, and on the customer's tracking page, within a
                minute of being issued.
              </p>
            )}

            {booking.paymentMethod === "card" &&
              booking.paymentStatus !== "paid" &&
              !booking.fareEstimate && (
                <p className="mt-4 text-sm text-amber-700">
                  No fare is set, so no payment link can be created. Confirming
                  this booking will not produce one until a fare exists.
                </p>
              )}
          </section>

          <section className="card">
            <h2 className="font-semibold mb-4">Customer</h2>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3.5 text-sm mb-4">
              <Detail label="Name" value={booking.customerName} />
              <Detail label="WhatsApp" value={`+${booking.customerWhatsapp}`} />
              <Detail label="Email" value={booking.customerEmail ?? undefined} />
            </dl>

            <a
              href={whatsappLink(booking.customerWhatsapp, customerMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-field bg-whatsapp px-4 py-2.5
                         text-sm font-semibold text-white hover:brightness-95 transition"
            >
              Message customer on WhatsApp
            </a>
          </section>

          <section className="card">
            <h2 className="font-semibold mb-1">Driver</h2>

            {assignment ? (
              <>
                <p className="text-sm text-ink-muted mb-4">
                  Assigned {formatPickup(assignment.assignedAt)}
                  {assignment.notes ? ` · ${assignment.notes}` : ""}
                </p>

                <div className="rounded-field bg-field p-4 mb-4">
                  <p className="font-semibold">{assignment.driverName}</p>
                  <p className="text-sm text-ink-muted">
                    +{assignment.driverWhatsapp}
                    {assignment.driverVehicle ? ` · ${assignment.driverVehicle}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={whatsappLink(assignment.driverWhatsapp, driverMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-field bg-whatsapp px-4 py-2.5
                               text-sm font-semibold text-white hover:brightness-95 transition"
                  >
                    Send job to driver
                  </a>

                  <form action={unassignDriver}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button type="submit" className="btn-secondary">
                      Unassign
                    </button>
                  </form>
                </div>
              </>
            ) : activeDrivers.length === 0 ? (
              <p className="text-sm text-ink-muted mt-3">
                No active drivers yet.{" "}
                <Link href="/admin/drivers" className="underline hover:text-ink">
                  Add one first
                </Link>
                .
              </p>
            ) : (
              <form action={assignDriver} className="mt-4">
                <input type="hidden" name="bookingId" value={booking.id} />

                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="field-label" htmlFor="driverId">
                      Driver
                    </label>
                    <select id="driverId" name="driverId" required className="field-input">
                      {activeDrivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                          {driver.vehicleAssigned ? ` — ${driver.vehicleAssigned}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label" htmlFor="notes">
                      Note (optional)
                    </label>
                    <input
                      id="notes"
                      name="notes"
                      placeholder="confirmed via WhatsApp at 3:40pm"
                      className="field-input"
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary">
                  Assign driver
                </button>
                <p className="mt-2 text-xs text-ink-faint">
                  Assigning moves the booking to “Driver assigned” and reveals the
                  driver&apos;s details on the customer&apos;s tracking page.
                </p>
              </form>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 flex flex-col gap-4">
          <section className="card">
            <h2 className="font-semibold mb-1">Update status</h2>
            <p className="text-sm text-ink-muted mb-4">
              Currently {STATUS_LABEL[booking.status].toLowerCase()}.
            </p>

            {NEXT_STATUSES[booking.status].length === 0 ? (
              <p className="text-sm text-ink-faint">
                This booking is complete. No further changes.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {NEXT_STATUSES[booking.status].map((next) => (
                  <form key={next} action={updateBookingStatus}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="status" value={next} />
                    <button
                      type="submit"
                      className={
                        next === "cancelled"
                          ? "w-full rounded-field border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
                          : "btn-primary w-full"
                      }
                    >
                      Mark {STATUS_LABEL[next].toLowerCase()}
                    </button>
                  </form>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="font-semibold mb-1">Customer tracking link</h2>
            <p className="text-sm text-ink-muted mb-3">
              What the customer sees for this booking.
            </p>
            <Link
              href={`/track/${booking.referenceCode}`}
              target="_blank"
              className="text-sm font-mono break-all hover:text-accent-strong"
            >
              /track/{booking.referenceCode}
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-ink-faint text-xs mb-0.5">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
