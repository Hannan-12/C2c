import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { createBookingSchema } from "@/lib/validation/booking";
import { generateReferenceCode } from "@/lib/reference-code";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Booking submission is a write from an anonymous visitor — cap it per IP. */
const SUBMIT_LIMIT = 10;
const SUBMIT_WINDOW_MS = 60 * 60 * 1000;

/** Reference collisions are vanishingly unlikely, but retry rather than 500. */
const MAX_CODE_ATTEMPTS = 5;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
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

  // Distance, duration and fare are filled in by the quote engine (M4).
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
    status: "requested" as const,
  };

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const referenceCode = generateReferenceCode();
    try {
      await db.insert(bookings).values({ ...row, referenceCode });
      return NextResponse.json(
        {
          referenceCode,
          status: row.status,
          pickupDatetime: row.pickupDatetime.toISOString(),
        },
        { status: 201 },
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) continue;
      console.error("Failed to create booking:", error);
      return NextResponse.json(
        { error: "Could not create booking" },
        { status: 500 },
      );
    }
  }

  console.error("Exhausted reference code attempts creating a booking");
  return NextResponse.json({ error: "Could not create booking" }, { status: 500 });
}
