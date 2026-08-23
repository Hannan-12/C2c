import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { createBookingSchema } from "@/lib/validation/booking";
import { generateReferenceCode } from "@/lib/reference-code";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { calculateQuote } from "@/lib/quote";
import { notifyBookingRequested } from "@/lib/email/notify";
import { dbErrorCode, dbErrorMessage } from "@/lib/db-error";
import { ensurePaymentLinkByReference } from "@/lib/payments/checkout";

/** Booking submission is a write from an anonymous visitor — cap it per IP. */
const SUBMIT_LIMIT = 10;
const SUBMIT_WINDOW_MS = 60 * 60 * 1000;

/** Reference collisions are vanishingly unlikely, but retry rather than 500. */
const MAX_CODE_ATTEMPTS = 5;

function isDuplicateKeyError(error: unknown): boolean {
  // Read through Drizzle's wrapper — the driver's code is on `error.cause`,
  // so checking the wrapper directly never matched and a collision 500'd.
  return dbErrorCode(error) === "ER_DUP_ENTRY";
}

export async function POST(req: Request) {
  const limit = rateLimit(
    `booking-create:${clientIp(req)}`,
    SUBMIT_LIMIT,
    SUBMIT_WINDOW_MS,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many booking requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Recalculated server-side rather than accepted from the request: the fare
  // the client displays is not authoritative and must not be trusted.
  //
  // A quote failure does not block the booking. The whole flow is a request
  // that an admin confirms manually (docs Section 3), so a Maps outage should
  // cost the client a fare estimate, not the lead.
  let quote: Awaited<ReturnType<typeof calculateQuote>> | null = null;
  try {
    quote = await calculateQuote({
      serviceType: input.serviceType,
      vehicleCategory: input.vehicleCategory,
      pickupLocation: input.pickupLocation,
      dropoffLocation: input.dropoffLocation,
      stops: input.stops?.map((s) => s.address),
      durationHours: input.durationHours,
    });
  } catch (error) {
    console.error("Quote failed during booking creation:", dbErrorMessage(error));
  }

  const row = {
    id: randomUUID(),
    serviceType: input.serviceType,
    pickupLocation: input.pickupLocation,
    pickupLat: input.pickupLat?.toString() ?? null,
    pickupLng: input.pickupLng?.toString() ?? null,
    dropoffLocation: input.dropoffLocation ?? null,
    dropoffLat: input.dropoffLat?.toString() ?? null,
    dropoffLng: input.dropoffLng?.toString() ?? null,
    stops: input.stops ?? null,
    pickupDatetime: input.pickupDatetime,
    durationHours: input.durationHours ?? null,
    flightNumber: input.flightNumber ?? null,
    vehicleCategory: input.vehicleCategory,
    passengerCount: input.passengerCount,
    luggageCount: input.luggageCount,
    customerName: input.customerName,
    customerWhatsapp: input.customerWhatsapp,
    customerEmail: input.customerEmail ?? null,
    paymentMethod: input.paymentMethod,
    // A card booking owes money but has nothing to pay yet — the link is
    // created when an admin confirms the fare, not now.
    paymentStatus:
      input.paymentMethod === "card"
        ? ("pending" as const)
        : ("not_required" as const),
    distanceKm: quote?.distanceKm?.toString() ?? null,
    durationMin: quote?.durationMin ?? null,
    fareEstimate: quote?.fareEstimate.toString() ?? null,
    // Nobody has agreed anything yet; the request has not been looked at. An
    // operator sets this if the fare they settle differs from the quote.
    agreedFare: null,
    status: "requested" as const,
  };

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const referenceCode = generateReferenceCode();
    try {
      await db.insert(bookings).values({ ...row, referenceCode });

      // Awaited, not fire-and-forget: on serverless the response ending can
      // freeze the instance mid-request, dropping a detached promise. It never
      // throws, and adds one API call to a request that already made one.
      await notifyBookingRequested({ ...row, referenceCode });

      /**
       * A card customer goes straight to Stripe from here.
       *
       * The alternative — take the request, have someone confirm it, then send
       * a link — loses the customer at the point they were most willing to
       * pay. They chose card, they have their wallet out, and asking them to
       * come back later converts worse than anything else on the page.
       *
       * Best-effort. If Stripe is unreachable, or the route could not be
       * measured so there is no fare to charge, the booking still exists and
       * the response simply carries no payUrl — the customer lands on their
       * tracking page, where Pay now is waiting. A booking that failed to
       * reach checkout is recoverable; one lost because Stripe was down is not.
       */
      let payUrl: string | null = null;
      if (row.paymentMethod === "card") {
        payUrl = await ensurePaymentLinkByReference(referenceCode);
      }

      return NextResponse.json(
        {
          referenceCode,
          status: row.status,
          pickupDatetime: row.pickupDatetime.toISOString(),
          distanceKm: quote?.distanceKm ?? null,
          durationMin: quote?.durationMin ?? null,
          fareEstimate: quote?.fareEstimate ?? null,
          currency: quote?.currency ?? null,
          payUrl,
        },
        { status: 201 },
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) continue;
      console.error("Failed to create booking:", dbErrorMessage(error));
      return NextResponse.json(
        { error: "Could not create booking" },
        { status: 500 },
      );
    }
  }

  console.error("Exhausted reference code attempts creating a booking");
  return NextResponse.json({ error: "Could not create booking" }, { status: 500 });
}
