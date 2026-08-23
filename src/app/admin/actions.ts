"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  bookings,
  bookingAssignments,
  bookingNotes,
  drivers,
  vehiclePricing,
  BOOKING_STATUSES,
  CANCELLATION_REASONS,
  VEHICLE_CATEGORIES,
  type CancellationReason,
} from "@/db/schema";
import { CANCELLATION_REASON_LABEL, CONFIRMED_STATUSES } from "@/lib/booking-status";
import { splitFare } from "@/lib/commission";
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

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function updateBookingStatus(formData: FormData) {
  const admin = await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("status") ?? "") as BookingStatus;

  if (!bookingId || !BOOKING_STATUSES.includes(status)) {
    throw new Error("Invalid status update");
  }

  /**
   * A cancellation must say why, at the moment it happens. The reason decides
   * what money comes back — early, late and no-show are three different
   * outcomes under the refund policy — and it is knowable now and only badly
   * reconstructed weeks later, which is precisely when a refund gets
   * questioned.
   */
  let cancellationReason: CancellationReason | undefined;

  if (status === "cancelled") {
    const reason = String(formData.get("cancellationReason") ?? "");
    if (!CANCELLATION_REASONS.includes(reason as never)) {
      throw new Error("Choose why this booking is being cancelled");
    }
    cancellationReason = reason as CancellationReason;
  }

  await db
    .update(bookings)
    .set(cancellationReason ? { status, cancellationReason } : { status })
    .where(eq(bookings.id, bookingId));

  /**
   * The chosen reason is a category; anything the operator typed alongside it
   * is the part that will actually explain the decision later. Recorded as an
   * ordinary note so both live in one timeline.
   */
  if (cancellationReason) {
    const detail = String(formData.get("cancellationDetail") ?? "").trim();
    await writeNote(
      bookingId,
      admin.email,
      detail
        ? `Cancelled — ${CANCELLATION_REASON_LABEL[cancellationReason]}. ${detail}`
        : `Cancelled — ${CANCELLATION_REASON_LABEL[cancellationReason]}.`,
    );
  }

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
  const admin = await requireAdmin();

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

  await writeNote(
    bookingId,
    admin.email,
    `Refunded AED ${amountAed.toFixed(2)} to the customer's card.`,
  );

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
  const admin = await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) throw new Error("Invalid fare update");

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) throw new Error("Booking not found");

  /**
   * A paid booking can still be re-quoted — the trip changed, stops were
   * added, part of it went wrong. Refusing outright was the safe first cut,
   * but it left the operator with a booking whose recorded fare they knew to
   * be wrong and no way to correct it.
   *
   * What is deliberately *not* done here is move money. Editing a figure and
   * having a card charged or refunded as a side effect is the kind of thing
   * nobody expects from a text field. The action records the truth; the
   * payment panel then shows the balance either way, and refunding stays the
   * explicit act it was.
   */

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
   * A fare that moved after the customer agreed it is the first question in
   * any dispute, so the change records itself rather than relying on whoever
   * made it to remember to write it down.
   */
  const before = booking.agreedFare ?? booking.fareEstimate;
  await writeNote(
    bookingId,
    admin.email,
    agreedFare
      ? `Fare set to AED ${agreedFare}${before ? ` (was AED ${before})` : ""}.`
      : `Agreed fare cleared; the route quote of AED ${booking.fareEstimate ?? "—"} applies.`,
  );

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

/**
 * Saves every vehicle's rates in one go.
 *
 * All five classes together rather than a save button per row. Rates are set
 * relative to each other — Business above Comfort, VIP above both — and saving
 * them one at a time means the site briefly quotes a price list nobody
 * intended. One submit, one transaction, one consistent state.
 *
 * This is what makes the client self-sufficient: until it existed, changing a
 * fare meant a developer with phpMyAdmin.
 */
export async function updatePricing(formData: FormData) {
  await requireAdmin();

  const FIELDS = ["baseFare", "perKm", "perMin", "minimumFare", "hourlyRate"] as const;

  const updates = VEHICLE_CATEGORIES.map((category) => {
    const rates = {} as Record<(typeof FIELDS)[number], string>;

    for (const field of FIELDS) {
      const raw = String(formData.get(`${category}.${field}`) ?? "").trim();
      const value = Number(raw);

      if (raw === "" || !Number.isFinite(value) || value < 0) {
        throw new Error(`${category}: enter a number of zero or more for every rate`);
      }
      // A slipped decimal point, not a real price. The most expensive tier's
      // hourly rate is nowhere near this.
      if (value > 100000) throw new Error(`${category}: ${raw} looks like a typing mistake`);

      rates[field] = value.toFixed(2);
    }

    /**
     * A minimum below the base fare can never bind — the fare starts at the
     * base and only goes up — so it is almost always a transposition. Caught
     * here rather than silently stored, since the symptom would be a floor
     * that quietly does nothing.
     */
    if (Number(rates.minimumFare) < Number(rates.baseFare)) {
      throw new Error(
        `${category}: the minimum fare is below the base fare, so it would never apply`,
      );
    }

    return { category, rates };
  });

  /**
   * One transaction, so a rate that fails validation cannot leave the price
   * list half-updated. Nothing here should fail after the loop above, which is
   * exactly why the guarantee is worth having — the failure would be the
   * unexpected kind.
   */
  await db.transaction(async (tx) => {
    for (const { category, rates } of updates) {
      await tx.update(vehiclePricing).set(rates).where(eq(vehiclePricing.category, category));
    }
  });

  /**
   * The public pages cache pricing for an hour. Revalidating means the client
   * sees their change on the site immediately rather than wondering whether it
   * saved, which is the difference between a screen they trust and one they
   * check twice.
   */
  revalidatePath("/");
  revalidatePath("/rides");
  revalidatePath("/admin/pricing");
}


/** Longer than anyone writes in a hurry, short enough to stay a note. */
const NOTE_MAX = 2000;

/**
 * Writes one entry on a booking's record.
 *
 * Internal to this module: notes are always written as part of something else
 * that happened — a cancellation, a fare change — or typed deliberately
 * through addBookingNote. Neither caller should be able to forge an author.
 */
async function writeNote(bookingId: string, authorEmail: string, body: string) {
  await db.insert(bookingNotes).values({
    id: randomUUID(),
    bookingId,
    authorEmail,
    body: body.slice(0, NOTE_MAX),
  });
}

/**
 * An operator's note on a booking.
 *
 * Never shown to the customer — the tracking page does not read this table —
 * so it can say what actually happened rather than something composed for an
 * audience. That is the whole reason it is useful three weeks later.
 */
export async function addBookingNote(formData: FormData) {
  const admin = await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!bookingId) throw new Error("Invalid note");
  if (!body) throw new Error("Write something before saving the note");

  await writeNote(bookingId, admin.email, body);

  revalidatePath(`/admin/bookings/${bookingId}`);
}

/**
 * Squares up every unsettled completed trip for one driver.
 *
 * The amount is written onto each assignment as it stands right now, rather
 * than recomputed whenever the page is opened. Money handed over in cash
 * cannot be un-handed, so a fare corrected or a refund issued afterwards must
 * not quietly rewrite what was agreed — the settled figure is a record of what
 * happened, not a live calculation.
 */
export async function settleDriverPayout(formData: FormData) {
  const admin = await requireAdmin();

  const driverId = String(formData.get("driverId") ?? "");
  if (!driverId) throw new Error("Driver is required");

  const rows = await db
    .select({
      assignmentId: bookingAssignments.id,
      bookingId: bookings.id,
      referenceCode: bookings.referenceCode,
      status: bookings.status,
      paymentMethod: bookings.paymentMethod,
      fareEstimate: bookings.fareEstimate,
      agreedFare: bookings.agreedFare,
      amountPaid: bookings.amountPaid,
      amountRefunded: bookings.amountRefunded,
    })
    .from(bookingAssignments)
    .innerJoin(bookings, eq(bookings.id, bookingAssignments.bookingId))
    .where(
      and(
        eq(bookingAssignments.driverId, driverId),
        eq(bookings.status, "completed"),
        isNull(bookingAssignments.payoutSettledAt),
      ),
    );

  if (rows.length === 0) throw new Error("Nothing outstanding for this driver");

  const settledAt = new Date();
  let balance = 0;

  await db.transaction(async (tx) => {
    for (const row of rows) {
      const split = splitFare(row);
      balance += split.balance;

      await tx
        .update(bookingAssignments)
        .set({ payoutSettledAt: settledAt, payoutAmount: split.balance.toFixed(2) })
        .where(eq(bookingAssignments.id, row.assignmentId));
    }
  });

  /**
   * Recorded on the bookings themselves, not only as a total. Six months on,
   * the question is never "what was the payout run" but "was this trip paid",
   * and the answer has to be findable from the trip.
   */
  const rounded = Math.round(balance * 100) / 100;
  const direction =
    rounded >= 0
      ? `Paid driver ${rounded.toFixed(2)} AED`
      : `Collected ${Math.abs(rounded).toFixed(2)} AED commission from driver`;

  for (const row of rows) {
    await writeNote(
      row.bookingId,
      admin.email,
      `${direction} — settled across ${rows.length} ${rows.length === 1 ? "trip" : "trips"}.`,
    );
  }

  revalidatePath("/admin/finance");
}

/**
 * Sends the confirmation email again, payment link included.
 *
 * notifyBookingConfirmed sends once and guards on confirmationEmailSentAt, so
 * that two admins acting at the same moment cannot both send. That guard is
 * right, and it also means a bounced email, a customer who deleted it, or —
 * as happened here — one sent before Stripe was configured and therefore
 * carrying no payment link, could never be replaced without editing the
 * database by hand. Clearing the stamp deliberately is the difference between
 * a guard and a trap.
 */
export async function resendConfirmation(formData: FormData) {
  const admin = await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) throw new Error("Invalid request");

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) throw new Error("Booking not found");
  if (!booking.customerEmail) {
    throw new Error("This booking has no email address. Add one first, or message the customer on WhatsApp.");
  }
  if (!CONFIRMED_STATUSES.includes(booking.status)) {
    throw new Error("Confirm the booking before sending a confirmation for it");
  }

  await db
    .update(bookings)
    .set({ confirmationEmailSentAt: null })
    .where(eq(bookings.id, bookingId));

  // Before the email, so the link it carries is current — the whole reason a
  // resend is usually being asked for.
  const payUrl = await ensurePaymentLink(bookingId);
  await notifyBookingConfirmed(bookingId, payUrl ?? undefined);

  await writeNote(
    bookingId,
    admin.email,
    `Confirmation resent to ${booking.customerEmail}${payUrl ? " with a payment link" : ""}.`,
  );

  revalidatePath(`/admin/bookings/${bookingId}`);
}

/**
 * Corrects the address a booking's email goes to.
 *
 * A mistyped address is the commonest reason a confirmation never arrives, and
 * until now the only fix was SQL. Recorded as a note because changing where a
 * customer's booking details are sent is worth being able to explain.
 */
export async function updateCustomerEmail(formData: FormData) {
  const admin = await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "");
  const email = String(formData.get("customerEmail") ?? "").trim().toLowerCase();

  if (!bookingId) throw new Error("Invalid request");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("Enter a valid email address");
  }

  const [booking] = await db
    .select({ id: bookings.id, customerEmail: bookings.customerEmail })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) throw new Error("Booking not found");
  if (booking.customerEmail === email) return;

  await db.update(bookings).set({ customerEmail: email }).where(eq(bookings.id, bookingId));

  await writeNote(
    bookingId,
    admin.email,
    `Email changed to ${email}${booking.customerEmail ? ` (was ${booking.customerEmail})` : ""}.`,
  );

  revalidatePath(`/admin/bookings/${bookingId}`);
}
