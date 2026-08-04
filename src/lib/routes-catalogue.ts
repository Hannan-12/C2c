import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vehiclePricing } from "@/db/schema";

/**
 * Popular UAE routes shown on the route board.
 *
 * Distances are static reference figures rather than live Routes API calls:
 * these are fixed, well-known corridors, and billing an API element on every
 * homepage render would be pure waste. The customer's own route is still
 * priced live at quote time.
 *
 * The client should confirm these before launch — they're researched
 * approximations, not surveyed figures.
 */
export type CataloguedRoute = {
  from: string;
  to: string;
  distanceKm: number;
  durationMin: number;
};

export const POPULAR_ROUTES: CataloguedRoute[] = [
  { from: "DXB Airport", to: "Downtown Dubai", distanceKm: 15, durationMin: 20 },
  { from: "DXB Airport", to: "Dubai Marina", distanceKm: 30, durationMin: 28 },
  { from: "Downtown Dubai", to: "Sharjah", distanceKm: 25, durationMin: 30 },
  { from: "Dubai", to: "Abu Dhabi", distanceKm: 145, durationMin: 95 },
  { from: "Dubai", to: "Al Ain", distanceKm: 130, durationMin: 90 },
];

export type PricedRoute = CataloguedRoute & { fromFare: number; currency: string };

/** Fallback mirrors the seeded Comfort rate, so the board still renders if the
 *  database is unreachable at build time (e.g. a CI build with no DB). */
const FALLBACK = {
  baseFare: 10,
  perKm: 2.5,
  perMin: 0.5,
  minimumFare: 45,
  currency: "AED",
};

export async function getPricedRoutes(): Promise<PricedRoute[]> {
  let rate = FALLBACK;

  try {
    const [row] = await db
      .select()
      .from(vehiclePricing)
      .where(eq(vehiclePricing.category, "comfort"))
      .limit(1);

    if (row) {
      rate = {
        baseFare: Number(row.baseFare),
        perKm: Number(row.perKm),
        perMin: Number(row.perMin),
        minimumFare: Number(row.minimumFare),
        currency: row.currency,
      };
    }
  } catch {
    // Fall through to the seeded defaults.
  }

  return POPULAR_ROUTES.map((route) => {
    const fare =
      rate.baseFare + rate.perKm * route.distanceKm + rate.perMin * route.durationMin;
    return {
      ...route,
      fromFare: Math.round(Math.max(fare, rate.minimumFare)),
      currency: rate.currency,
    };
  });
}
