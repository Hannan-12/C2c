import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { notifyRefundIssued } from "@/lib/email/notify";

/**
 * Writes a refund onto its booking, and tells the customer.
 *
 * Shared by the two things that learn about a refund: the admin action that
 * issues one, and the webhook Stripe sends whether we issued it or someone did
 * it from the dashboard. Both must reach the same state, and a refund recorded
 * twice — once by each — must not email the customer twice.
 *
 * The amount is the charge's running total, not this refund's delta. Stripe
 * reports it that way, and it makes the write idempotent for free: the update
 * only matches when the stored figure is smaller, so a redelivered webhook, or
 * a webhook arriving after the action already recorded the same refund, is a
 * no-op. Refunds only ever increase, which is what makes the comparison safe.
 */
export async function recordRefund(opts: {
  paymentIntentId: string;
  /** Running total refunded on the charge, in AED. */
  refundedAed: number;
  /** What was captured, in AED. Decides whether the charge is now whole. */
  capturedAed: number;
}): Promise<{ applied: boolean; whole: boolean }> {
  const refunded = opts.refundedAed.toFixed(2);
  const whole = opts.capturedAed > 0 && opts.refundedAed >= opts.capturedAed;

  const applied = await db
    .update(bookings)
    .set({
      amountRefunded: refunded,
      refundedAt: new Date(),
      // A partial refund leaves the booking paid: money did change hands and
      // some of it stayed. Only a full refund undoes the payment.
      ...(whole ? { paymentStatus: "refunded" as const } : {}),
    })
    .where(
      and(
        eq(bookings.stripePaymentIntentId, opts.paymentIntentId),
        or(isNull(bookings.amountRefunded), lt(bookings.amountRefunded, sql`${refunded}`)),
      ),
    );

  if (applied[0].affectedRows === 0) return { applied: false, whole };

  /**
   * Tell the customer, because nothing else will. The tracking page shows the
   * refund, but only to someone who thinks to look — and the days between us
   * sending and their bank showing it are exactly when a person decides they
   * have been ignored and calls their card issuer.
   *
   * Inside the `applied` guard, so the same refund seen twice emails once.
   * Best-effort and never throws: a mail outage must not undo a refund that is
   * already recorded correctly.
   */
  const [booking] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.stripePaymentIntentId, opts.paymentIntentId))
    .limit(1);

  if (booking) {
    await notifyRefundIssued(booking.id, { amountRefunded: opts.refundedAed, whole });
  }

  return { applied: true, whole };
}
