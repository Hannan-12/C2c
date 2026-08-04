import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vehiclePricing, type ServiceType, type VehicleCategory } from "@/db/schema";
import { computeRoute, RoutesApiError } from "./routes-api";

export type Quote = {
  distanceKm: number | null;
  durationMin: number | null;
  fareEstimate: number;
  currency: string;
  /** How the fare was arrived at — shown to the customer in the dock summary. */
  basis: "distance" | "hourly";
};

export type QuoteRequest = {
  serviceType: ServiceType;
  vehicleCategory: VehicleCategory;
  pickupLocation: string;
  dropoffLocation?: string | null;
  stops?: string[];
  durationHours?: number | null;
};

export class QuoteError extends Error {}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function calculateQuote(req: QuoteRequest): Promise<Quote> {
  const [pricing] = await db
    .select()
    .from(vehiclePricing)
    .where(eq(vehiclePricing.category, req.vehicleCategory))
    .limit(1);

  if (!pricing || !pricing.active) {
    throw new QuoteError(`No active pricing for vehicle category "${req.vehicleCategory}"`);
  }

  // Hourly bookings are priced on time booked, not distance travelled — there
  // is no destination to measure to (docs Section 5).
  if (req.serviceType === "hourly") {
    if (!req.durationHours) {
      throw new QuoteError("Duration is required for hourly bookings");
    }
    const fare = Number(pricing.hourlyRate) * req.durationHours;
    return {
      distanceKm: null,
      durationMin: req.durationHours * 60,
      fareEstimate: round2(Math.max(fare, Number(pricing.minimumFare))),
      currency: pricing.currency,
      basis: "hourly",
    };
  }

  if (!req.dropoffLocation) {
    throw new QuoteError("Dropoff location is required for this service type");
  }

  const route = await computeRoute({
    origin: req.pickupLocation,
    destination: req.dropoffLocation,
    waypoints: req.stops,
  });

  const fare =
    Number(pricing.baseFare) +
    Number(pricing.perKm) * route.distanceKm +
    Number(pricing.perMin) * route.durationMin;

  return {
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    fareEstimate: round2(Math.max(fare, Number(pricing.minimumFare))),
    currency: pricing.currency,
    basis: "distance",
  };
}

export { RoutesApiError };
