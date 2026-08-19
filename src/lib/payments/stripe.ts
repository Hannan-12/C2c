import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stripe, over the HTTPS API (docs Section 7 conventions).
 *
 * Calls fetch directly rather than adding the `stripe` package, matching
 * routes-api.ts and email/client.ts. We use two endpoints and verify one
 * webhook signature; the SDK would be a large dependency earning very little.
 * The signature check below is the one part that must be exactly right, so it
 * is written out rather than hidden.
 */

const API = "https://api.stripe.com/v1";

/**
 * Stripe takes amounts in the currency's smallest unit. AED has two decimal
 * places, so fils — 76.55 AED is 7655. Rounding here rather than truncating
 * means a half-fil rounds toward the customer's favour by at most one fil.
 */
const AED_MINOR_UNITS = 100;

export class StripeError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "StripeError";
  }
}

function secretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

/** True when Stripe is configured. Card payment is hidden from the form otherwise. */
export function paymentsEnabled(): boolean {
  return secretKey() !== null;
}

async function stripeRequest(
  path: string,
  body: Record<string, string>,
): Promise<Record<string, unknown>> {
  const key = secretKey();
  if (!key) throw new StripeError("STRIPE_SECRET_KEY is not configured");

  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const error = payload.error as { message?: string } | undefined;
    throw new StripeError(
      `Stripe rejected the request (${response.status}): ${error?.message ?? "unknown"}`,
      response.status,
    );
  }

  return payload;
}

export type CheckoutSession = { id: string; url: string };

/**
 * A hosted Checkout session for one confirmed booking.
 *
 * Hosted rather than an embedded card form: Stripe hosts the page, so card
 * details never touch our server and PCI scope stays at the smallest tier.
 * That matters for a business without a compliance programme.
 */
export async function createCheckoutSession(opts: {
  referenceCode: string;
  bookingId: string;
  amountAed: number;
  description: string;
  customerEmail: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutSession> {
  const amountMinor = Math.round(opts.amountAed * AED_MINOR_UNITS);

  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    throw new StripeError(`Refusing to charge a non-positive amount: ${opts.amountAed}`);
  }

  const body: Record<string, string> = {
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "aed",
    "line_items[0][price_data][unit_amount]": String(amountMinor),
    "line_items[0][price_data][product_data][name]": `Booking ${opts.referenceCode}`,
    "line_items[0][price_data][product_data][description]": opts.description,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    // Carried back on the webhook, so a payment is matched to its booking by
    // our own id rather than by parsing the product name.
    "metadata[booking_id]": opts.bookingId,
    "metadata[reference_code]": opts.referenceCode,
    client_reference_id: opts.referenceCode,
  };

  if (opts.customerEmail) body.customer_email = opts.customerEmail;

  const session = await stripeRequest("/checkout/sessions", body);

  const id = session.id;
  const url = session.url;
  if (typeof id !== "string" || typeof url !== "string") {
    throw new StripeError("Stripe returned a session without an id or url");
  }

  return { id, url };
}

/**
 * Verifies a webhook came from Stripe and is recent.
 *
 * Without this, anyone who finds the endpoint could POST a `checkout.session
 * .completed` and mark bookings paid for free. The signed payload is
 * `timestamp.rawBody`, so the raw bytes must be verified before parsing — a
 * re-serialised object would not match.
 *
 * The timestamp check bounds replay: a signature stays valid forever
 * otherwise, so a captured request could be resent indefinitely.
 */
const REPLAY_TOLERANCE_SECONDS = 300;

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;

  const parts = new Map(
    signatureHeader.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key.trim(), rest.join("=").trim()] as const;
    }),
  );

  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > REPLAY_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  // timingSafeEqual throws on a length mismatch, which is itself a leak of
  // information — check length first and return the same false either way.
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
