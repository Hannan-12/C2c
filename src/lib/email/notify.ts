import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { sendEmail } from "./client";
import { bookingConfirmed, bookingRequestReceived, type BookingEmailData } from "./templates";

/**
 * Booking notifications (docs Section 3).
 *
 * Every function here is best-effort and never throws. A booking that exists
 * in the database but failed to email is recoverable — the admin sees it in
 * the dashboard and follows up on WhatsApp, which is the real confirmation
 * channel anyway. A booking lost because Resend was down is not.
 */

/** Email is optional on the booking form, so there is often nobody to write to. */
function recipient(booking: { customerEmail: string | null }): string | null {
  const email = booking.customerEmail?.trim();
  return email ? email : null;
}

/** Numeric columns come back from MySQL as decimal strings. */
function num(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type BookingRow = typeof bookings.$inferSelect;

/**
 * Only the columns the templates read. Narrower than a full row so the create
 * route can notify from the values it just inserted, without a read-back.
 */
export type NotifiableBooking = Pick<
  BookingRow,
  | "referenceCode"
  | "serviceType"
  | "customerName"
  | "customerEmail"
  | "pickupLocation"
  | "dropoffLocation"
  | "pickupDatetime"
  | "durationHours"
  | "flightNumber"
  | "distanceKm"
  | "durationMin"
  | "fareEstimate"
>;

function toEmailData(booking: NotifiableBooking, customerEmail: string): BookingEmailData {
  return {
    referenceCode: booking.referenceCode,
    serviceType: booking.serviceType,
    customerName: booking.customerName,
    customerEmail,
    pickupLocation: booking.pickupLocation,
    dropoffLocation: booking.dropoffLocation,
    pickupDatetime: booking.pickupDatetime,
    durationHours: booking.durationHours,
    flightNumber: booking.flightNumber,
    distanceKm: num(booking.distanceKm),
    durationMin: booking.durationMin,
    fareEstimate: num(booking.fareEstimate),
  };
}

/** "Booking Request Received" — sent on submission. */
export async function notifyBookingRequested(booking: NotifiableBooking): Promise<void> {
  const email = recipient(booking);
  if (!email) return;

  try {
    await sendEmail(bookingRequestReceived(toEmailData(booking, email)));
  } catch (error) {
    console.error(
      `Failed to send request email for booking ${booking.referenceCode}:`,
      error,
    );
  }
}

/**
 * "Booking Confirmed" — sent the first time a booking reaches a confirmed
 * state, and only once.
 *
 * The guard is a conditional UPDATE rather than a read-then-write: two admins
 * acting at the same moment would both pass a read check and both send. Here
 * only one UPDATE can match the `IS NULL` condition, so only that one emails.
 */
export async function notifyBookingConfirmed(bookingId: string): Promise<void> {
  const claimed = await db
    .update(bookings)
    .set({ confirmationEmailSentAt: new Date() })
    .where(and(eq(bookings.id, bookingId), isNull(bookings.confirmationEmailSentAt)));

  // rowsAffected is 0 when another request already claimed the send.
  if (claimed[0].affectedRows === 0) return;

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) return;

  const email = recipient(booking);
  if (!email) return;

  try {
    await sendEmail(bookingConfirmed(toEmailData(booking, email)));
  } catch (error) {
    // Clear the claim so a later status change can retry the send.
    await db
      .update(bookings)
      .set({ confirmationEmailSentAt: null })
      .where(eq(bookings.id, bookingId));

    console.error(
      `Failed to send confirmation email for booking ${booking.referenceCode}:`,
      error,
    );
  }
}
