import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { verifyWebhookSignature } from "@/lib/payments/stripe";
import { dbErrorMessage } from "@/lib/db-error";

/**
 * Stripe payment webhook.
 *
 * This is the only place a booking is marked paid. The browser redirect after
 * checkout is not proof of anything — a customer can close the tab before it
 * fires, or open the success URL directly — so the money is recorded here,
 * where Stripe tells us server-to-server and signs what it says.
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
