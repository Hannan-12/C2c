"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingAssignments, drivers, BOOKING_STATUSES } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";
import { notifyBookingConfirmed } from "@/lib/email/notify";
import { ensurePaymentLink } from "@/lib/payments/checkout";
import { createRefund } from "@/lib/payments/stripe";
import { recordRefund } from "@/lib/payments/record-refund";
import { SESSION_COOKIE } from "@/lib/session";
import type { BookingStatus } from "@/lib/booking-status";

/**
 * Every action re-verifies the session. Middleware gates the routes, but a
 * server action is its own POST endpoint — it is reachable without ever
 * rendering the page that contains it.
 */

/**
 * Statuses that mean the booking is agreed with the customer. An admin can
 * jump straight from "requested" to "assigned" without passing through
 * "confirmed", so the confirmation email keys off the whole set, not one value.
 */
const CONFIRMED_STATUSES: BookingStatus[] = [
  "confirmed",
  "assigned",
  "en_route",
  "completed",
];

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function updateBookingStatus(formData: FormData) {
  await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("status") ?? "") as BookingStatus;

  if (!bookingId || !BOOKING_STATUSES.includes(status)) {
    throw new Error("Invalid status update");
  }

  await db.update(bookings).set({ status }).where(eq(bookings.id, bookingId));

  // Anything from "confirmed" onwards means the booking is agreed, so the
  // customer is owed the confirmation email. notifyBookingConfirmed sends it
  // at most once, whichever of these transitions happens first.
  if (CONFIRMED_STATUSES.includes(status)) {
    // Before the email, so a card customer's confirmation carries the link
    // rather than arriving first and being followed by a second message.
    const payUrl = await ensurePaymentLink(bookingId);
    await notifyBookingConfirmed(bookingId, payUrl ?? undefined);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function assignDriver(formData: FormData) {
  await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "");
  const driverId = String(formData.get("driverId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!bookingId || !driverId) throw new Error("Booking and driver are required");

  // Replace any previous assignment rather than stacking rows, so the tracking
  // page's join can't return two drivers for one booking.
  await db.delete(bookingAssignments).where(eq(bookingAssignments.bookingId, bookingId));

  await db.insert(bookingAssignments).values({
    id: randomUUID(),
    bookingId,
    driverId,
    notes: notes || null,
  });

  // Assigning a driver is what moves the booking to "assigned"; doing it here
  // means the operator can't leave the two out of step. Only advances from the
  // earlier states — a booking already en route or completed stays where it is.
  await db
    .update(bookings)
    .set({ status: "assigned" })
    .where(
      and(
        eq(bookings.id, bookingId),
        inArray(bookings.status, [
          "requested",
          "awaiting_confirmation",
          "confirmed",
        ]),
      ),
    );

  // Assigning can be the first confirming transition, so the payment link is
  // created here too — otherwise a booking that went straight from requested
  // to assigned would be confirmed by email with nothing to pay against.
  const payUrl = await ensurePaymentLink(bookingId);
  await notifyBookingConfirmed(bookingId, payUrl ?? undefined);

  revalidatePath("/admin");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function unassignDriver(formData: FormData) {
  await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) throw new Error("Booking is required");

  await db.delete(bookingAssignments).where(eq(bookingAssignments.bookingId, bookingId));

  await db
    .update(bookings)
    .set({ status: "confirmed" })
    .where(eq(bookings.id, bookingId));

  revalidatePath("/admin");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function createDriver(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const whatsapp = String(formData.get("whatsappNumber") ?? "").replace(/[\s\-()+]/g, "");
  const vehicle = String(formData.get("vehicleAssigned") ?? "").trim();

  if (!name) throw new Error("Driver name is required");
  if (!/^\d{8,15}$/.test(whatsapp)) {
    throw new Error("Enter a valid WhatsApp number in international format");
  }

  await db.insert(drivers).values({
    id: randomUUID(),
    name,
    whatsappNumber: whatsapp,
    vehicleAssigned: vehicle || null,
    active: true,
  });

  revalidatePath("/admin/drivers");
}

export async function toggleDriverActive(formData: FormData) {
  await requireAdmin();

  const driverId = String(formData.get("driverId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!driverId) throw new Error("Driver is required");

  await db.update(drivers).set({ active }).where(eq(drivers.id, driverId));

  revalidatePath("/admin/drivers");
}

/**
 * Refunds a card payment, in full or in part.
 *
 * Deliberately the one destructive money action in the admin, so it is
 * validated harder than the rest. It moves someone else's money, it cannot be
 * undone from here, and the operator is often working from a WhatsApp message
 * rather than a form — so every constraint the refund policy implies is
 * checked server-side rather than trusted from the input.
 *
 * The write and the customer email are not done here: recordRefund owns both,
 * shared with the Stripe webhook. A refund issued from the Stripe dashboard
 * has to reach the same state, and whichever of the two arrives second must be
 * a no-op rather than a second email.
 */
export async function refundBooking(formData: FormData) {
  await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) throw new Error("Invalid refund request");

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) throw new Error("Booking not found");
  if (!booking.stripePaymentIntentId) {
    throw new Error("This booking has no card payment to refund");
  }
  if (booking.paymentStatus !== "paid") {
    throw new Error("Only a paid booking can be refunded");
  }

  const paid = Number(booking.amountPaid ?? 0);
  const already = Number(booking.amountRefunded ?? 0);
  const outstanding = Math.round((paid - already) * 100) / 100;

  if (!(outstanding > 0)) throw new Error("This booking is already fully refunded");

  /**
   * Blank means the rest of it. The common case is a full refund, and making
   * the operator retype a figure they can already see is how the wrong number
   * gets typed.
   */
  const requested = String(formData.get("amount") ?? "").trim();
  const amountAed = requested === "" ? outstanding : Number(requested);

  if (!Number.isFinite(amountAed) || amountAed <= 0) {
    throw new Error("Enter a refund amount greater than zero");
  }
  if (amountAed > outstanding) {
    throw new Error(
      `Cannot refund more than the ${outstanding.toFixed(2)} AED still outstanding`,
    );
  }

  const refund = await createRefund({
    paymentIntentId: booking.stripePaymentIntentId,
    // Omitted when it is the whole remainder, so Stripe computes the figure
    // and a rounding disagreement cannot leave a fil behind.
    amountAed: amountAed === outstanding ? undefined : amountAed,
    referenceCode: booking.referenceCode,
  });

  await recordRefund({
    paymentIntentId: booking.stripePaymentIntentId,
    refundedAed: refund.chargeRefundedAed,
    capturedAed: refund.chargeAmountAed,
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

/**
 * Sets the fare a person agreed with the customer.
 *
 * Written to `agreedFare`, leaving the calculated estimate intact, so the
 * booking can always answer both "what did you quote me" and "what am I
 * paying". Clearing the field falls back to the estimate.
 *
 * Refuses once the card has been charged. Changing the figure then would leave
 * the booking claiming one amount while Stripe holds another — the customer
 * needs either a second charge or a partial refund, and neither is something
 * to do silently behind a fare edit.
 */
export async function updateFare(formData: FormData) {
  await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) throw new Error("Invalid fare update");

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) throw new Error("Booking not found");

  if (booking.paymentStatus === "paid") {
    throw new Error(
      "This booking is already paid. Refund it, or take the difference separately, rather than changing the fare underneath a completed payment.",
    );
  }

  const raw = String(formData.get("fare") ?? "").trim();

  // Empty means "no override" — the calculated estimate stands again.
  let agreedFare: string | null = null;

  if (raw !== "") {
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a fare greater than zero, or leave it blank to use the estimate");
    }
    // Guards a slipped decimal point rather than a real price: the most
    // expensive tier at its hourly rate does not approach this.
    if (amount > 100000) throw new Error("That fare looks like a typing mistake");

    agreedFare = amount.toFixed(2);
  }

  await db.update(bookings).set({ agreedFare }).where(eq(bookings.id, bookingId));

  /**
   * Re-issue the payment link so it carries the new amount. ensurePaymentLink
   * overwrites the stored session id, and the webhook matches on the current
   * one — so the superseded link stops being able to settle this booking even
   * though Stripe will still serve it until it expires.
   *
   * Only for a card booking that has been agreed with the customer. Creating a
   * link for a request nobody has confirmed yet would invite payment for a trip
   * we have not accepted.
   */
  if (booking.paymentMethod === "card" && CONFIRMED_STATUSES.includes(booking.status)) {
    await ensurePaymentLink(bookingId);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath(`/track/${booking.referenceCode}`);
}
