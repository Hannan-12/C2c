import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  bookings,
  bookingAssignments,
  bookingNotes,
  drivers,
  CANCELLATION_REASONS,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";
import { fareWasAgreed, payableFare } from "@/lib/fare";
import { EMIRATES, EMIRATE_LABEL, EMIRATE_SLUG, guessCity } from "@/lib/emirates";
import { availabilitySlip, jobSlip } from "@/lib/slips";
import { CopyButton } from "@/components/copy-button";
import { BRAND } from "@/lib/seo";
import {
  CANCELLATION_REASON_LABEL,
  CONFIRMED_STATUSES,
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
import {
  addBookingNote,
  assignDriver,
  updateBookingCity,
  resendConfirmation,
  updateCustomerEmail,
  refundBooking,
  unassignDriver,
  updateBookingStatus,
  updateFare,
} from "../../actions";

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
  searchParams,
}: PageProps<"/admin/bookings/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;

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

  /**
   * Newest first: an operator opening a booking wants what just happened, not
   * how it began. The oldest entry is still one scroll away.
   */
  const notes = await db
    .select()
    .from(bookingNotes)
    .where(eq(bookingNotes.bookingId, booking.id))
    .orderBy(desc(bookingNotes.createdAt));

  const activeDrivers = await db
    .select({
      id: drivers.id,
      name: drivers.name,
      vehicleAssigned: drivers.vehicleAssigned,
      city: drivers.city,
    })
    .from(drivers)
    .where(eq(drivers.active, true))
    .orderBy(asc(drivers.name));

  /**
   * The drivers based where the customer is picked up — and only those, unless
   * the operator asks for more.
   *
   * Narrow by default because whoever collects the customer should be near
   * them, and a list of everyone invites assigning a pickup an hour away. But
   * narrow is not always right: an Abu Dhabi to Dubai run can suit a Dubai
   * driver who is already down there, and the alternative to widening was
   * misstating the pickup emirate to get at them, which corrupts the dispatch
   * record to work around a dropdown.
   *
   * So it widens on a deliberate click, and says loudly that it has.
   */
  const widened = query.drivers === "all";

  const localDrivers = booking.city
    ? activeDrivers.filter((d) => d.city === booking.city)
    : [];

  const otherDrivers = booking.city
    ? activeDrivers.filter((d) => d.city !== booking.city)
    : activeDrivers;

  const assignableDrivers = widened ? [...localDrivers, ...otherDrivers] : localDrivers;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const trackingUrl = `${siteUrl}/track/${booking.referenceCode}`;
  const route = booking.dropoffLocation
    ? `${booking.pickupLocation} → ${booking.dropoffLocation}`
    : `${booking.pickupLocation} (${booking.durationHours ?? "?"}h hire)`;

  // Prefilled so the operator never retypes trip details into WhatsApp
  // (docs Section 8).
  /** The figure that gets charged: the agreed fare, else the route quote. */
  const payable = payableFare(booking);
  const agreedDiffers = fareWasAgreed(booking);

  /**
   * Net of everything that has actually moved, against what is owed.
   *
   * Positive means the customer still owes; negative means they were charged
   * too much and are owed it back. Both happen once a trip changes after
   * payment, and an operator who cannot see which is which will guess.
   */
  const settled = Number(booking.amountPaid ?? 0) - Number(booking.amountRefunded ?? 0);
  const balance = payable === null ? 0 : Math.round((payable - settled) * 100) / 100;
  const overpaid = balance < 0 ? Math.abs(balance) : 0;

  /**
   * What is still refundable. Computed here so the form can offer it as the
   * default and cap the input — the server checks it again, since a max
   * attribute is a hint to the browser and nothing more.
   */
  const outstanding =
    Math.round(
      (Number(booking.amountPaid ?? 0) - Number(booking.amountRefunded ?? 0)) * 100,
    ) / 100;

  const customerMessage = `Hi ${booking.customerName}, this is ${BRAND} about your booking ${booking.referenceCode} — ${route} on ${formatPickup(booking.pickupDatetime)}. Track it here: ${trackingUrl}`;
  /**
   * Two slips, deliberately different. The first goes to a whole city's group
   * and withholds the customer and the money; the second goes to the one
   * person now doing the trip and withholds nothing.
   */
  /**
   * Bookings taken before the city column existed have none, and neither do
   * ones whose pickup named no emirate. Guessing here rather than only at
   * creation means an old booking still arrives with the right group
   * pre-selected instead of asking the operator to work it out.
   */
  const suggestedCity =
    booking.city ?? guessCity(booking.pickupLocation, booking.dropoffLocation);

  const groupSlip = availabilitySlip(booking);
  const driverMessage = assignment?.driverName
    ? jobSlip(booking, assignment.driverName)
    : "";

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
                label="Quoted from the route"
                value={
                  booking.fareEstimate ? formatFare(Number(booking.fareEstimate)) : "Not calculated"
                }
              />
              {/*
                Only when it differs. On the ordinary booking the quote is the
                fare, and a second row repeating it would make the exception
                harder to spot rather than easier.
              */}
              {agreedDiffers && (
                <Detail label="Agreed with the customer" value={formatFare(payable!)} />
              )}
            </dl>

            {/*
              Editable, because the fare a person settles on WhatsApp is the
              one that gets charged — extra stops, a negotiated rate, or a trip
              the customer changed after booking. Until this existed the link
              could only ever charge the calculated estimate.

              The quote stays visible above rather than being overwritten, so
              a booking can always answer both "what did you quote me" and
              "what am I paying".
            */}
            {booking.paymentStatus === "paid" && balance !== 0 && (
              /*
                The gap between what is owed and what has actually moved. Shown
                as a fact with the amount spelled out, not as an instruction:
                whether the difference is worth collecting, waiving or refunding
                is the operator's call, and a screen that decided for them would
                be wrong about half the time.
              */
              <p
                className={`mt-5 pt-5 border-t border-line text-sm ${
                  balance > 0 ? "text-amber-700" : "text-ink-muted"
                }`}
              >
                {balance > 0 ? (
                  <>
                    <strong>{formatFare(balance)} still to collect.</strong> The
                    agreed fare is {formatFare(payable ?? 0)} and{" "}
                    {formatFare(settled)} has been taken. Take it in cash, or send
                    a fresh payment link.
                  </>
                ) : (
                  <>
                    <strong>{formatFare(overpaid)} overpaid.</strong> The agreed
                    fare is {formatFare(payable ?? 0)} and {formatFare(settled)}{" "}
                    has been taken. The refund below is set to the difference.
                  </>
                )}
              </p>
            )}

            <form action={updateFare} className="mt-5 pt-5 border-t border-line">
                <input type="hidden" name="bookingId" value={booking.id} />
                <label htmlFor="fare" className="field-label">
                  Agreed fare — blank uses the{" "}
                  {booking.fareEstimate
                    ? `quote of ${formatFare(Number(booking.fareEstimate))}`
                    : "route quote, once there is one"}
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    id="fare"
                    name="fare"
                    type="number"
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    defaultValue={booking.agreedFare ? Number(booking.agreedFare) : ""}
                    placeholder={
                      booking.fareEstimate ? Number(booking.fareEstimate).toFixed(2) : "0.00"
                    }
                    className="field-input w-40"
                  />
                  <button type="submit" className="btn-secondary">
                    Save fare
                  </button>
                </div>
              {booking.paymentMethod === "card" && booking.paymentStatus !== "paid" && (
                <p className="mt-2 text-xs text-ink-faint">
                  Saving issues a new payment link for this amount. Any link
                  already sent stops working.
                </p>
              )}
              {booking.paymentStatus === "paid" && (
                <p className="mt-2 text-xs text-ink-faint">
                  Already paid, so nothing is charged or refunded by saving —
                  the difference is shown above and acted on separately.
                </p>
              )}
            </form>
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
              {/*
                Says "None yet" rather than disappearing, once money has been
                taken. A blank row on a paid booking is ambiguous — an operator
                cannot tell whether no refund was issued or one was issued and
                failed to record — and that ambiguity is worst on a cancelled
                booking, where a refund is probably owed.
              */}
              <Detail
                label="Refunded"
                value={
                  booking.amountRefunded
                    ? formatFare(Number(booking.amountRefunded))
                    : booking.paymentStatus === "paid"
                      ? "None yet"
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
              The refund form. Amount left blank means the rest of it, because
              a full refund is the common case and retyping a figure already on
              screen is how the wrong figure gets typed.

              No confirmation step: the operator is normally acting on a
              customer message they are already looking at, and an extra click
              on every refund would train them to click through it. The
              protection is the server — it re-reads the booking, refuses more
              than is outstanding, and sends an idempotency key so a
              double-submit cannot pay twice.
            */}
            {/*
              Beside the refund control, not buried in the notes: whoever is
              about to move money should see the grounds for it without having
              to go looking, since the reason is what decides the amount.
            */}
            {booking.cancellationReason && (
              <p className="mt-4 text-sm">
                <span className="text-ink-faint">Cancelled — </span>
                <span className="font-medium">
                  {CANCELLATION_REASON_LABEL[booking.cancellationReason]}
                </span>
              </p>
            )}

            {booking.paymentStatus === "paid" &&
              booking.stripePaymentIntentId &&
              outstanding > 0 && (
                <form action={refundBooking} className="mt-5 pt-5 border-t border-line">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <label htmlFor="refund-amount" className="field-label">
                    {overpaid > 0
                      ? `Refund amount — set to the ${formatFare(overpaid)} overpaid`
                      : `Refund amount — leave blank for the full ${formatFare(outstanding)}`}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id="refund-amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={outstanding}
                      inputMode="decimal"
                      defaultValue={overpaid > 0 ? overpaid.toFixed(2) : ""}
                    placeholder={outstanding.toFixed(2)}
                      className="field-input w-40"
                    />
                    <button type="submit" className="btn-secondary">
                      Refund to card
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-ink-faint">
                    Goes back to the card that paid, through Stripe. The
                    customer is emailed and their tracking page updates.
                  </p>
                </form>
              )}

            {booking.paymentStatus === "refunded" && (
              <p className="mt-4 text-sm text-ink-muted">
                Fully refunded. Anything further has to be handled in the Stripe
                dashboard.
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

          {/*
            The booking's memory. Every agreement with a customer happens on
            WhatsApp and lives only there, so without this a refund questioned
            three weeks later has nothing behind it but recollection.

            Never shown to the customer — the tracking page does not read this
            table — so it can say what actually happened.
          */}
          <section className="card">
            <h2 className="font-semibold mb-1">Notes</h2>
            <p className="text-sm text-ink-muted mb-4">
              Internal only. The customer never sees these.
            </p>

            <form action={addBookingNote} className="mb-5">
              <input type="hidden" name="bookingId" value={booking.id} />
              <label htmlFor="body" className="sr-only">
                Add a note
              </label>
              <textarea
                id="body"
                name="body"
                rows={2}
                required
                placeholder="What was agreed, and with whom"
                className="field-input mb-2 resize-y"
              />
              <button type="submit" className="btn-secondary">
                Add note
              </button>
            </form>

            {notes.length === 0 ? (
              <p className="text-sm text-ink-faint">
                Nothing recorded yet. Cancellations and fare changes write here
                automatically.
              </p>
            ) : (
              <ol className="border-t border-line">
                {notes.map((note) => (
                  <li key={note.id} className="border-b border-line py-3 last:border-0">
                    <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                    <p className="mt-1 text-[11px] text-ink-faint">
                      {note.authorEmail} · {formatPickup(note.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
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

            {/*
              A mistyped address is the commonest reason a confirmation never
              arrives, and until this existed the only fix was SQL.
            */}
            <form
              action={updateCustomerEmail}
              className="mt-5 pt-5 border-t border-line"
            >
              <input type="hidden" name="bookingId" value={booking.id} />
              <label htmlFor="customerEmail" className="field-label">
                {booking.customerEmail ? "Correct the email" : "Add an email"}
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  required
                  defaultValue={booking.customerEmail ?? ""}
                  placeholder="them@example.com"
                  className="field-input flex-1 min-w-52"
                />
                <button type="submit" className="btn-secondary">
                  Save
                </button>
              </div>
            </form>

            {/*
              The confirmation sends once, guarded so two admins cannot both
              send it. That guard becomes a trap when the one email that went
              out bounced, or predates the payment link — hence a deliberate
              way to send it again.
            */}
            {CONFIRMED_STATUSES.includes(booking.status) && booking.customerEmail && (
              <form action={resendConfirmation} className="mt-4">
                <input type="hidden" name="bookingId" value={booking.id} />
                <button type="submit" className="btn-secondary">
                  Resend confirmation
                  {booking.paymentMethod === "card" && booking.paymentStatus !== "paid"
                    ? " and payment link"
                    : ""}
                </button>
                <p className="mt-1.5 text-xs text-ink-faint">
                  {booking.confirmationEmailSentAt
                    ? `Last sent ${formatPickup(booking.confirmationEmailSentAt)}.`
                    : "Not sent yet."}{" "}
                  Goes to {booking.customerEmail}.
                </p>
              </form>
            )}
          </section>

          {/*
            The two slips a job produces, in the order they go out: find a
            driver, then tell the one who took it.
          */}
          <section className="card">
            <h2 className="font-semibold mb-1">Driver slips</h2>
            <p className="text-sm text-ink-muted mb-4">
              Offer it to a city&apos;s group first, then send the full details
              to whoever takes it.
            </p>

            <form action={updateBookingCity} className="mb-5 pb-5 border-b border-line">
              <input type="hidden" name="bookingId" value={booking.id} />
              <label htmlFor="city" className="field-label">
                Which group
                {booking.city
                  ? ""
                  : suggestedCity
                    ? " — suggested from the pickup, save to confirm"
                    : " — the pickup address names no emirate"}
              </label>
              <div className="flex flex-wrap gap-2">
                <select
                  id="city"
                  name="city"
                  defaultValue={booking.city ?? suggestedCity ?? ""}
                  required
                  className="field-input w-44"
                >
                  <option value="" disabled>
                    Choose
                  </option>
                  {EMIRATES.map((e) => (
                    <option key={e} value={e}>
                      {EMIRATE_LABEL[e]}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-secondary">
                  Save
                </button>
              </div>
            </form>

            <p className="field-label">
              1 · To the {booking.city ? EMIRATE_LABEL[booking.city] : "city"} group
            </p>

            {/*
              A picture, not a pasted block. In a group chat text is one message
              among hundreds and WhatsApp collapses it after four lines; an image
              survives forwarding, stays legible, and can be read at a red light.

              An ordinary img so the operator can see what they are about to
              send. The route sets Content-Disposition, so the same URL behind
              the button downloads rather than opens.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/admin/bookings/${booking.id}/slip?for=group`}
              alt={`Group slip for ${booking.referenceCode}`}
              className="mb-3 w-full max-w-lg rounded-field border border-line"
            />

            <div className="flex flex-wrap gap-2">
              <a
                href={`/admin/bookings/${booking.id}/slip?for=group`}
                download={`${booking.referenceCode}-group.png`}
                className="btn-primary"
              >
                Download picture
              </a>
              <CopyButton text={groupSlip} label="Copy as text" />
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              No customer name, number or fare — everyone in the group sees this,
              including the drivers who will not do the job.
            </p>

            {assignment && driverMessage && (
              <>
                <p className="field-label mt-6">2 · To {assignment.driverName}</p>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/admin/bookings/${booking.id}/slip?for=driver`}
                  alt={`Job slip for ${assignment.driverName}`}
                  className="mb-3 w-full max-w-lg rounded-field border border-line"
                />

                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/admin/bookings/${booking.id}/slip?for=driver`}
                    download={`${booking.referenceCode}-driver.png`}
                    className="btn-primary"
                  >
                    Download picture
                  </a>
                  {/*
                    WhatsApp cannot be handed an image through a link — only
                    text — so the chat opens with the details written out and
                    the picture is attached from the download.
                  */}
                  <a
                    href={whatsappLink(assignment.driverWhatsapp, driverMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-field bg-whatsapp px-4 py-2.5
                               text-sm font-semibold text-white hover:brightness-95 transition"
                  >
                    Open chat
                  </a>
                  <CopyButton text={driverMessage} label="Copy as text" />
                </div>
                <p className="mt-2 text-xs text-ink-faint">
                  Customer details and the driver&apos;s share — only for the
                  driver doing this trip.
                </p>
              </>
            )}
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
            ) : !booking.city ? (
              <p className="text-sm text-ink-muted">
                Set the pickup emirate under{" "}
                <strong>Driver slips</strong> above, then its drivers appear
                here.
              </p>
            ) : assignableDrivers.length === 0 ? (
              <p className="text-sm text-ink-muted mt-3">
                No active drivers in{" "}
                {booking.city ? EMIRATE_LABEL[booking.city] : "this emirate"}.{" "}
                <Link
                  href={`/admin/drivers/${booking.city ? EMIRATE_SLUG[booking.city] : "dubai"}`}
                  className="underline hover:text-ink"
                >
                  Add one there
                </Link>
                {otherDrivers.length > 0 && (
                  <>
                    , or{" "}
                    <Link
                      href={`/admin/bookings/${booking.id}?drivers=all`}
                      className="underline hover:text-ink"
                    >
                      assign someone from another emirate
                    </Link>
                  </>
                )}
                . Check the pickup emirate above if it looks wrong.
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
                      {/*
                        Grouped once widened, with the pickup's own emirate
                        first and the rest labelled by where they are — an
                        out-of-emirate driver is a decision, and the label is
                        what makes it one rather than a mis-click.
                      */}
                      {widened ? (
                        <>
                          <optgroup
                            label={`${booking.city ? EMIRATE_LABEL[booking.city] : "Local"} — nearest the pickup`}
                          >
                            {localDrivers.map((driver) => (
                              <option key={driver.id} value={driver.id}>
                                {driver.name}
                                {driver.vehicleAssigned ? ` — ${driver.vehicleAssigned}` : ""}
                              </option>
                            ))}
                          </optgroup>
                          {EMIRATES.filter((e) => e !== booking.city).map((emirate) => {
                            const list = otherDrivers.filter((d) => d.city === emirate);
                            return list.length === 0 ? null : (
                              <optgroup key={emirate} label={`${EMIRATE_LABEL[emirate]} — travelling in`}>
                                {list.map((driver) => (
                                  <option key={driver.id} value={driver.id}>
                                    {driver.name}
                                    {driver.vehicleAssigned ? ` — ${driver.vehicleAssigned}` : ""}
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </>
                      ) : (
                        assignableDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name}
                            {driver.vehicleAssigned ? ` — ${driver.vehicleAssigned}` : ""}
                          </option>
                        ))
                      )}
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
                  {widened ? (
                    <>
                      Showing every emirate.{" "}
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="underline hover:text-ink"
                      >
                        Just {booking.city ? EMIRATE_LABEL[booking.city] : "the pickup emirate"}
                      </Link>
                      . A driver from elsewhere has to travel to the pickup —
                      only worth it if they are already nearby.
                      <br />
                    </>
                  ) : otherDrivers.length > 0 ? (
                    <>
                      Only {booking.city ? EMIRATE_LABEL[booking.city] : "local"} drivers.{" "}
                      <Link
                        href={`/admin/bookings/${booking.id}?drivers=all`}
                        className="underline hover:text-ink"
                      >
                        Show all {otherDrivers.length} from other emirates
                      </Link>{" "}
                      if someone is already travelling that way.
                      <br />
                    </>
                  ) : null}
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
                {NEXT_STATUSES[booking.status]
                  .filter((next) => next !== "cancelled")
                  .map((next) => (
                    <form key={next} action={updateBookingStatus}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <input type="hidden" name="status" value={next} />
                      <button type="submit" className="btn-primary w-full">
                        Mark {STATUS_LABEL[next].toLowerCase()}
                      </button>
                    </form>
                  ))}

                {/*
                  Cancelling asks why before it will go through. Every other
                  transition stays one click, because only this one decides
                  what money comes back — and the answer is knowable now and
                  badly reconstructed weeks later, which is exactly when a
                  refund gets questioned.
                */}
                {NEXT_STATUSES[booking.status].includes("cancelled") && (
                  <form
                    action={updateBookingStatus}
                    className="rounded-field border border-red-200 bg-red-50/60 p-3 mt-1"
                  >
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="status" value="cancelled" />

                    <label htmlFor="cancellationReason" className="field-label">
                      Cancelling — why?
                    </label>
                    <select
                      id="cancellationReason"
                      name="cancellationReason"
                      required
                      defaultValue=""
                      className="field-input mb-2"
                    >
                      <option value="" disabled>
                        Choose a reason
                      </option>
                      {CANCELLATION_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {CANCELLATION_REASON_LABEL[r]}
                        </option>
                      ))}
                    </select>

                    <input
                      name="cancellationDetail"
                      type="text"
                      placeholder="Anything worth remembering (optional)"
                      className="field-input mb-2"
                    />

                    <button
                      type="submit"
                      className="w-full rounded-field border border-red-200 bg-red-50 px-4 py-2.5
                                 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
                    >
                      Cancel this booking
                    </button>
                  </form>
                )}
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
