import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { canonical } from "@/lib/seo";
import { createCheckoutSession, paymentsEnabled } from "./stripe";
import { dbErrorMessage } from "@/lib/db-error";
import { isValidReferenceCode, normaliseReferenceCode } from "@/lib/reference-code";
import { payableFare } from "@/lib/fare";

/**
 * Creates the payment link for a confirmed card booking.
 *
 * Deliberately not called at submission time: a booking is a request until an
 * admin agrees the fare, and charging before that would mean refunding every
 * trip the business turns down. By the time this runs the fare is settled and
 * the amount is real.
 *
 * Best-effort, like the email notifications. A booking that exists but has no
 * payment link is recoverable — the admin sees it and can retry, or take cash.
 * A confirmation blocked because Stripe was down is not.
 */
export async function ensurePaymentLink(bookingId: string): Promise<string | null> {
  if (!paymentsEnabled()) return null;

  try {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) return null;
    if (booking.paymentMethod !== "card") return null;
    if (booking.paymentStatus === "paid") return null;

    /**
     * The agreed fare where one exists, not the calculated estimate. An
     * operator who settled a different figure with the customer must be able
     * to charge that figure — otherwise the link contradicts the conversation
     * the customer had, which is the dispute this whole flow exists to avoid.
     */
    const amount = payableFare(booking) ?? 0;
    if (!Number.isFinite(amount) || amount <= 0) {
      // No agreed fare yet — a quote can fail without blocking the booking, so
      // this is an ordinary state, not an error. The admin sets a fare first.
      console.info(
        `No payment link for ${booking.referenceCode}: fare is not set`,
      );
      return null;
    }

    const session = await createCheckoutSession({
      bookingId: booking.id,
      referenceCode: booking.referenceCode,
      amountAed: amount,
      description: `${booking.pickupLocation} → ${booking.dropoffLocation ?? "as arranged"}`,
      customerEmail: booking.customerEmail,
      successUrl: canonical(`/track/${booking.referenceCode}?paid=1`),
      cancelUrl: canonical(`/track/${booking.referenceCode}`),
    });

    /**
     * Overwrites any earlier session id. A superseded session can still be
     * paid until it expires, but the webhook matches on the *current* id, so a
     * late payment against an old session is logged rather than applied — the
     * alternative, accepting whichever arrives, would let a stale amount
     * settle a revised fare.
     */
    await db
      .update(bookings)
      .set({ stripeSessionId: session.id, paymentStatus: "pending" })
      .where(eq(bookings.id, bookingId));

    return session.url;
  } catch (error) {
    console.error(
      `Failed to create a payment link for booking ${bookingId}:`,
      dbErrorMessage(error),
    );
    return null;
  }
}

/**
 * Same thing, addressed by the customer's own reference code.
 *
 * The tracking page needs this: the payment link is emailed once, and an email
 * gets lost or never arrives if no address was given. Anyone holding a
 * reference code can already see the booking, and the worst this grants is the
 * ability to pay someone else's fare.
 */
export async function ensurePaymentLinkByReference(
  reference: string,
): Promise<string | null> {
  const code = normaliseReferenceCode(reference);
  if (!isValidReferenceCode(code)) return null;

  const [row] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.referenceCode, code))
    .limit(1);

  return row ? ensurePaymentLink(row.id) : null;
}
