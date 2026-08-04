import { NextResponse } from "next/server";
import { getBookingByReference } from "@/lib/booking-lookup";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Public, unauthenticated tracking lookup (docs Section 9).
 *
 * Two defences against using this to harvest customer data:
 *  - long random reference codes (docs Section 5.1)
 *  - per-IP rate limiting, so guessing at scale is impractical even if the
 *    code format were known
 */
const LOOKUP_LIMIT = 20;
const LOOKUP_WINDOW_MS = 10 * 60 * 1000;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const limit = rateLimit(
    `booking-lookup:${clientIp(req)}`,
    LOOKUP_LIMIT,
    LOOKUP_WINDOW_MS,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many lookups. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { reference } = await params;
  const booking = await getBookingByReference(reference);

  // Same response for malformed and not-found, so the endpoint doesn't confirm
  // which codes are structurally valid.
  if (!booking) {
    return NextResponse.json(
      { error: "No booking found with that reference code" },
      { status: 404 },
    );
  }

  return NextResponse.json(booking, { headers: { "Cache-Control": "no-store" } });
}
