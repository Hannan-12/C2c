import { NextResponse } from "next/server";
import { and, eq, ne, or, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { verifyWebhookSignature } from "@/lib/payments/stripe";
import { dbErrorMessage } from "@/lib/db-error";
import { notifyRefundIssued } from "@/lib/email/notify";

/**
 * Stripe payment webhook.
 *
 * This is the only place a booking is marked paid or refunded. The browser
 * redirect after checkout is not proof of anything — a customer can close the
 * tab before it fires, or open the success URL directly — so the money is
 * recorded here, where Stripe tells us server-to-server and signs what it
 * says.
 *
 * Refunds are issued by a person in the Stripe dashboard, not by this app.
 * That is deliberate: a refund is an irreversible movement of someone else's
 * money, it is decided case by case against the refund policy, and the
 * dashboard already has the audit trail and the partial-refund controls. What
 * the app owes the customer is an honest record of it, which is what
 * charge.refunded provides.
 */

/** Stripe retries on any non-2xx, so a 500 here means "try me again". */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Raw text, not req.json(): the signature covers the exact bytes Stripe
  // sent, and re-serialising a parsed object would change them.
  const rawBody = await req.text();

  if (!verifyWebhookSignature(rawBody, req.headers.get("stripe-signature"), secret)) {
    // 400, not 401 — Stripe should not retry a request it cannot sign correctly.
    console.warn("Rejected a Stripe webhook with an invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  // Every other event type is acknowledged and ignored, so enabling extra
  // events in the Stripe dashboard never produces retry storms here.
  if (event.type === "charge.refunded") {
    return recordRefund(event.data?.object ?? {});
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data?.object ?? {};
  const bookingId = (session.metadata as { booking_id?: string } | undefined)?.booking_id;
  const sessionId = typeof session.id === "string" ? session.id : null;

  if (!bookingId || !sessionId) {
    console.error("Stripe checkout.session.completed without booking metadata");
    // 200: retrying will not add the metadata. Logged for investigation.
    return NextResponse.json({ received: true });
  }

  // Stripe only settles a session that is actually paid; guard anyway, because
  // `completed` fires for zero-amount and async payment methods too.
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const amountMinor = typeof session.amount_total === "number" ? session.amount_total : null;
  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  try {
    /**
     * Conditional on the booking not already being paid, so Stripe's
     * at-least-once delivery cannot overwrite paidAt with a later timestamp on
     * a redelivery. Matching the session id as well means a webhook for an old,
     * superseded session cannot mark a booking paid against a newer one.
     */
    const claimed = await db
      .update(bookings)
      .set({
        paymentStatus: "paid",
        paidAt: new Date(),
        amountPaid: amountMinor === null ? null : (amountMinor / 100).toFixed(2),
        stripePaymentIntentId: paymentIntent,
      })
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.stripeSessionId, sessionId),
          ne(bookings.paymentStatus, "paid"),
        ),
      );

    if (claimed[0].affectedRows === 0) {
      // Already recorded, or the session is not the current one. Both are fine.
      console.info(`Stripe webhook for ${bookingId} applied no change (session ${sessionId})`);
    }
  } catch (error) {
    console.error("Failed to record Stripe payment:", dbErrorMessage(error));
    // 500 so Stripe retries — the customer has been charged and the booking
    // must not stay unpaid in our records.
    return NextResponse.json({ error: "Could not record payment" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * A refund issued in the Stripe dashboard, mirrored onto the booking.
 *
 * Stripe sends the charge's running total in `amount_refunded`, not the delta,
 * so a second partial refund arrives as the new total and this stays correct
 * without adding anything up locally.
 *
 * Matched on the payment intent rather than the session: a refund belongs to a
 * charge, and the session that created it may since have been superseded by a
 * re-quote.
 */
async function recordRefund(charge: Record<string, unknown>): Promise<NextResponse> {
  const paymentIntent =
    typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  const refundedMinor =
    typeof charge.amount_refunded === "number" ? charge.amount_refunded : 0;
  // What was actually taken — a partly-captured charge refunds against the
  // captured figure, not the authorised one.
  const capturedMinor =
    typeof charge.amount_captured === "number"
      ? charge.amount_captured
      : typeof charge.amount === "number"
        ? charge.amount
        : 0;

  if (!paymentIntent || refundedMinor <= 0) {
    console.error("Stripe charge.refunded without a payment intent or an amount");
    // 200: a retry cannot supply what the payload never had.
    return NextResponse.json({ received: true });
  }

  const refunded = (refundedMinor / 100).toFixed(2);
  const whole = capturedMinor > 0 && refundedMinor >= capturedMinor;

  try {
    /**
     * Conditional on the stored figure being smaller, so an out-of-order or
     * redelivered webhook cannot walk a total backwards. Refunds only ever
     * increase, which makes the comparison the whole idempotency check.
     */
    const applied = await db
      .update(bookings)
      .set({
        amountRefunded: refunded,
        refundedAt: new Date(),
        // Partial refunds leave the booking `paid`: money did change hands and
        // some of it stayed. Only a full refund undoes the payment.
        ...(whole ? { paymentStatus: "refunded" as const } : {}),
      })
      .where(
        and(
          eq(bookings.stripePaymentIntentId, paymentIntent),
          or(
            isNull(bookings.amountRefunded),
            lt(bookings.amountRefunded, sql`${refunded}`),
          ),
        ),
      );

    if (applied[0].affectedRows === 0) {
      // Already recorded at this amount or higher, or the intent is not one of
      // ours. Both are fine; neither is worth a retry.
      console.info(`Stripe refund for ${paymentIntent} applied no change`);
      return NextResponse.json({ received: true });
    }

    /**
     * Tell the customer, because nothing else will. The tracking page shows
     * the refund, but only to someone who thinks to go and look — and the days
     * between us sending and their bank showing it are exactly when a person
     * decides they have been ignored and calls their card issuer.
     *
     * Gated on the update having matched, which is the same condition that
     * makes the record idempotent: a redelivery never reaches this line, and a
     * genuine second partial refund correctly sends again with the new figure.
     *
     * Best-effort and never throws, so a mail outage cannot make Stripe retry
     * a refund we have already recorded correctly.
     */
    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.stripePaymentIntentId, paymentIntent))
      .limit(1);

    if (booking) {
      await notifyRefundIssued(booking.id, {
        amountRefunded: refundedMinor / 100,
        whole,
      });
    }
  } catch (error) {
    console.error("Failed to record Stripe refund:", dbErrorMessage(error));
    // 500 so Stripe retries — a refund the customer has been given must not
    // stay invisible in our records.
    return NextResponse.json({ error: "Could not record refund" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
