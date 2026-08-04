import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingAssignments, drivers } from "@/db/schema";
import { isValidReferenceCode, normaliseReferenceCode } from "@/lib/reference-code";
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
  const code = normaliseReferenceCode(reference);

  // Same response for malformed and not-found, so the endpoint doesn't confirm
  // which codes are structurally valid.
  const notFound = NextResponse.json(
    { error: "No booking found with that reference code" },
    { status: 404 },
  );

  if (!isValidReferenceCode(code)) return notFound;

  const [row] = await db
    .select({
      referenceCode: bookings.referenceCode,
      serviceType: bookings.serviceType,
      status: bookings.status,
      pickupLocation: bookings.pickupLocation,
      dropoffLocation: bookings.dropoffLocation,
      pickupDatetime: bookings.pickupDatetime,
      durationHours: bookings.durationHours,
      vehicleCategory: bookings.vehicleCategory,
      passengerCount: bookings.passengerCount,
      luggageCount: bookings.luggageCount,
      distanceKm: bookings.distanceKm,
      durationMin: bookings.durationMin,
      fareEstimate: bookings.fareEstimate,
      customerName: bookings.customerName,
      driverName: drivers.name,
      driverWhatsapp: drivers.whatsappNumber,
      driverVehicle: drivers.vehicleAssigned,
    })
    .from(bookings)
    .leftJoin(bookingAssignments, eq(bookingAssignments.bookingId, bookings.id))
    .leftJoin(drivers, eq(drivers.id, bookingAssignments.driverId))
    .where(eq(bookings.referenceCode, code))
    .limit(1);

  if (!row) return notFound;

  // Driver contact details are only released once the ride is actually assigned.
  const driverVisible =
    row.driverName !== null &&
    ["assigned", "en_route", "completed"].includes(row.status);

  return NextResponse.json(
    {
      referenceCode: row.referenceCode,
      serviceType: row.serviceType,
      status: row.status,
      pickupLocation: row.pickupLocation,
      dropoffLocation: row.dropoffLocation,
      pickupDatetime: row.pickupDatetime,
      durationHours: row.durationHours,
      vehicleCategory: row.vehicleCategory,
      passengerCount: row.passengerCount,
      luggageCount: row.luggageCount,
      distanceKm: row.distanceKm,
      durationMin: row.durationMin,
      fareEstimate: row.fareEstimate,
      customerName: row.customerName,
      driver: driverVisible
        ? {
            name: row.driverName,
            whatsapp: row.driverWhatsapp,
            vehicle: row.driverVehicle,
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
