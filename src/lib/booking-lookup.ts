import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingAssignments, drivers } from "@/db/schema";
import { isValidReferenceCode, normaliseReferenceCode } from "./reference-code";
import type { BookingStatus } from "./booking-status";

/**
 * Shape returned to the public tracking page and the tracking API.
 *
 * Single definition on purpose: this is the boundary where customer data
 * leaves an unauthenticated endpoint, so both callers must expose exactly the
 * same fields. Anything absent here is not public.
 */
export type PublicBooking = {
  referenceCode: string;
  serviceType: string;
  status: BookingStatus;
  pickupLocation: string;
  dropoffLocation: string | null;
  pickupDatetime: Date;
  durationHours: number | null;
  flightNumber: string | null;
  vehicleCategory: string;
  passengerCount: number;
  luggageCount: number;
  distanceKm: string | null;
  durationMin: number | null;
  fareEstimate: string | null;
  customerName: string;
  driver: { name: string; whatsapp: string; vehicle: string | null } | null;
};

/** Driver contact is released only once the ride is actually assigned. */
const DRIVER_VISIBLE_STATUSES = ["assigned", "en_route", "completed"];

export async function getBookingByReference(
  reference: string,
): Promise<PublicBooking | null> {
  const code = normaliseReferenceCode(reference);
  if (!isValidReferenceCode(code)) return null;

  const [row] = await db
    .select({
      referenceCode: bookings.referenceCode,
      serviceType: bookings.serviceType,
      status: bookings.status,
      pickupLocation: bookings.pickupLocation,
      dropoffLocation: bookings.dropoffLocation,
      pickupDatetime: bookings.pickupDatetime,
      durationHours: bookings.durationHours,
      flightNumber: bookings.flightNumber,
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

  if (!row) return null;

  const driverVisible =
    row.driverName !== null && DRIVER_VISIBLE_STATUSES.includes(row.status);

  return {
    referenceCode: row.referenceCode,
    serviceType: row.serviceType,
    status: row.status,
    pickupLocation: row.pickupLocation,
    dropoffLocation: row.dropoffLocation,
    pickupDatetime: row.pickupDatetime,
    durationHours: row.durationHours,
    flightNumber: row.flightNumber,
    vehicleCategory: row.vehicleCategory,
    passengerCount: row.passengerCount,
    luggageCount: row.luggageCount,
    distanceKm: row.distanceKm,
    durationMin: row.durationMin,
    fareEstimate: row.fareEstimate,
    customerName: row.customerName,
    driver: driverVisible
      ? {
          name: row.driverName!,
          whatsapp: row.driverWhatsapp!,
          vehicle: row.driverVehicle,
        }
      : null,
  };
}
