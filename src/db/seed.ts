import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

/**
 * Starting fare rates in AED.
 *
 * Placeholder figures loosely modelled on the reference platform's published
 * "from" prices — the client must confirm real rates before launch. Editable
 * afterwards from the admin settings screen without a redeploy.
 */
const RATES = [
  { category: "comfort" as const, baseFare: "10.00", perKm: "2.50", perMin: "0.50", minimumFare: "45.00", hourlyRate: "80.00" },
  { category: "business" as const, baseFare: "20.00", perKm: "3.50", perMin: "0.75", minimumFare: "85.00", hourlyRate: "140.00" },
  { category: "suv" as const, baseFare: "25.00", perKm: "4.50", perMin: "0.90", minimumFare: "120.00", hourlyRate: "180.00" },
  { category: "vip" as const, baseFare: "50.00", perKm: "7.00", perMin: "1.50", minimumFare: "220.00", hourlyRate: "320.00" },
  { category: "van" as const, baseFare: "30.00", perKm: "4.00", perMin: "0.80", minimumFare: "110.00", hourlyRate: "170.00" },
];

async function main() {
  // Imported dynamically: a static import would be hoisted above
  // loadEnvConfig, and the db module reads DATABASE_URL at module scope.
  const { db } = await import("./index");
  const { vehiclePricing } = await import("./schema");

  for (const rate of RATES) {
    await db
      .insert(vehiclePricing)
      .values({ ...rate, currency: "AED", active: true })
      .onDuplicateKeyUpdate({ set: { ...rate } });
  }

  console.log(`Seeded ${RATES.length} vehicle pricing rows.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
