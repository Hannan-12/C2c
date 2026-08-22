import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vehiclePricing, type VehicleCategory } from "@/db/schema";
import { VEHICLE_SPECS, type VehicleSpec } from "@/lib/vehicles";

/**
 * The fleet as customers see it: what each tier holds, and what it starts at.
 *
 * Separate from lib/vehicles.ts because that module is imported by the booking
 * form, which is a client component — pulling the database driver in there
 * would ship mysql2 to the browser. Capacity is static and safe to share;
 * prices come from the database and stay on the server.
 *
 * The homepage table used to carry its own copy of the starting fares, so the
 * same figure lived in three places: the pricing table, the static specs, and
 * the page. A price change updates one of them, and a customer reads a fare on
 * the homepage that the booking form then contradicts — which is the dispute
 * this avoids. The published figure now comes from the row the quote is
 * calculated from.
 */
export type FleetRow = VehicleSpec & { from: number };

/**
 * Falls back to the static specs when the table cannot be read. A homepage
 * showing slightly stale headline prices beats one that fails to load, and the
 * fare a customer is actually charged is quoted from the database either way.
 */
export async function getFleet(): Promise<FleetRow[]> {
  const fares = new Map<VehicleCategory, number>();

  try {
    const rows = await db
      .select({
        category: vehiclePricing.category,
        minimumFare: vehiclePricing.minimumFare,
      })
      .from(vehiclePricing)
      .where(eq(vehiclePricing.active, true));

    for (const row of rows) {
      fares.set(row.category, Math.round(Number(row.minimumFare)));
    }
  } catch {
    // Seeded defaults below.
  }

  return VEHICLE_SPECS.map((spec) => ({
    ...spec,
    from: fares.get(spec.id) ?? spec.from,
  }));
}
