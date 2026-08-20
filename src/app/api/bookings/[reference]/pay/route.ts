import { NextResponse } from "next/server";
import { ensurePaymentLinkByReference } from "@/lib/payments/checkout";
import { paymentsEnabled } from "@/lib/payments/stripe";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Mints a Stripe Checkout link for a booking, from its reference code.
 *
 * The tracking page needs this because the emailed link is a single shot: the
 * email may never have been sent (the address is optional) or may have been
 * lost. Rather than storing a link and handing it back, this asks
 * ensurePaymentLink for the current one, so an amount revised since the email
 * went out is the amount charged.
 *
 * Unauthenticated, like the tracking page it serves. A reference code already
 * reveals the booking; the only thing this adds is the ability to pay someone
 * else's fare, which nobody does by accident and no one is harmed by.
 */
const PAY_LIMIT = 10;
const PAY_WINDOW_MS = 10 * 60 * 1000;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  if (!paymentsEnabled()) {
    return NextResponse.json({ error: "Card payment is unavailable" }, { status: 503 });
  }

  const limit = rateLimit(`pay:${clientIp(req)}`, PAY_LIMIT, PAY_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { reference } = await params;
  const url = await ensurePaymentLinkByReference(reference);

  if (!url) {
    // Deliberately one message for every failure: unknown reference, cash
    // booking, already paid, no fare agreed yet. Distinguishing them would let
    // this endpoint be used to probe which reference codes exist.
    return NextResponse.json(
      { error: "There's nothing to pay for on this booking right now." },
      { status: 400 },
    );
  }

  return NextResponse.json({ url });
}
