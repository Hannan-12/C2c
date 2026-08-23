import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  vehiclePricing,
  VEHICLE_CATEGORIES,
  type ServiceType,
  type VehicleCategory,
} from "@/db/schema";
import { computeRoute, RoutesApiError, type RouteLeg } from "./routes-api";

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

type PricingRow = typeof vehiclePricing.$inferSelect;

/**
 * The fare rule itself, given one tier's rates and a measured route.
 *
 * Extracted so the single-category and all-category paths cannot drift: a
 * change to how a fare is computed has to land in both, and the surest way to
 * make that true is for there to be only one of them.
 *
 * Exported for the pricing screen's worked example, which has to price a
 * sample trip using the real rule rather than an approximation of it — a
 * preview that computes fares differently from the quote is worse than none.
 */
export function fareFor(
  pricing: PricingRow,
  opts: { route: RouteLeg | null; durationHours?: number | null },
): number {
  // Hourly bookings are priced on time booked, not distance travelled — there
  // is no destination to measure to (docs Section 5).
  const fare = opts.route
    ? Number(pricing.baseFare) +
      Number(pricing.perKm) * opts.route.distanceKm +
      Number(pricing.perMin) * opts.route.durationMin
    : Number(pricing.hourlyRate) * (opts.durationHours ?? 0);

  return round2(Math.max(fare, Number(pricing.minimumFare)));
}

export async function calculateQuote(req: QuoteRequest): Promise<Quote> {
  const [pricing] = await db
    .select()
    .from(vehiclePricing)
    .where(eq(vehiclePricing.category, req.vehicleCategory))
    .limit(1);

  if (!pricing || !pricing.active) {
    throw new QuoteError(`No active pricing for vehicle category "${req.vehicleCategory}"`);
  }

  if (req.serviceType === "hourly") {
    if (!req.durationHours) {
      throw new QuoteError("Duration is required for hourly bookings");
    }
    return {
      distanceKm: null,
      durationMin: req.durationHours * 60,
      fareEstimate: fareFor(pricing, { route: null, durationHours: req.durationHours }),
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

  return {
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    fareEstimate: fareFor(pricing, { route }),
    currency: pricing.currency,
    basis: "distance",
  };
}

export type CategoryQuote = {
  category: VehicleCategory;
  fareEstimate: number;
  currency: string;
};

export type AllCategoriesQuote = {
  distanceKm: number | null;
  durationMin: number | null;
  basis: "distance" | "hourly";
  vehicles: CategoryQuote[];
};

/**
 * Every tier's fare for one trip, so the vehicle picker can show a real price
 * on each card rather than one price for the selected card.
 *
 * The distance is measured once and the rates are read once. Calling
 * calculateQuote five times would work — computeRoute caches by rounded
 * coordinates, so four would likely hit that cache — but only likely: the
 * cache expires, and a cold one bills five Routes elements for a single trip
 * and makes five database round trips. Doing it once is the guarantee.
 */
export async function quoteAllCategories(
  req: Omit<QuoteRequest, "vehicleCategory">,
): Promise<AllCategoriesQuote> {
  const rows = await db
    .select()
    .from(vehiclePricing)
    .where(eq(vehiclePricing.active, true));

  if (rows.length === 0) {
    throw new QuoteError("No active vehicle pricing is configured");
  }

  const hourly = req.serviceType === "hourly";

  if (hourly && !req.durationHours) {
    throw new QuoteError("Duration is required for hourly bookings");
  }
  if (!hourly && !req.dropoffLocation) {
    throw new QuoteError("Dropoff location is required for this service type");
  }

  const route = hourly
    ? null
    : await computeRoute({
        origin: req.pickupLocation,
        destination: req.dropoffLocation!,
        waypoints: req.stops,
      });

  const byCategory = new Map(rows.map((row) => [row.category, row]));

  /**
   * Ordered by the enum, not by whatever order MySQL returned the rows in, so
   * the picker's cheapest-to-dearest reading order is a property of the code
   * rather than of the table.
   */
  const vehicles = VEHICLE_CATEGORIES.flatMap((category) => {
    const pricing = byCategory.get(category);
    if (!pricing) return [];
    return [
      {
        category,
        fareEstimate: fareFor(pricing, { route, durationHours: req.durationHours }),
        currency: pricing.currency,
      },
    ];
  });

  return {
    distanceKm: route?.distanceKm ?? null,
    durationMin: route ? route.durationMin : (req.durationHours ?? 0) * 60,
    basis: hourly ? "hourly" : "distance",
    vehicles,
  };
}

export { RoutesApiError };
