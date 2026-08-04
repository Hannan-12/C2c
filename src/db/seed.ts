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
  const { vehiclePricing, adminUsers } = await import("./schema");
  const { hashPassword } = await import("../lib/password");
  const { randomUUID } = await import("crypto");

  for (const rate of RATES) {
    await db
      .insert(vehiclePricing)
      .values({ ...rate, currency: "AED", active: true })
      .onDuplicateKeyUpdate({ set: { ...rate } });
  }

  console.log(`Seeded ${RATES.length} vehicle pricing rows.`);

  // Admin account. Idempotent: an existing account keeps its current password
  // rather than being silently reset on every seed run.
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed.");
  } else {
    const { eq } = await import("drizzle-orm");
    const [existing] = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);

    if (existing) {
      console.log(`Admin ${email} already exists — left unchanged.`);
    } else {
      await db.insert(adminUsers).values({
        id: randomUUID(),
        email,
        passwordHash: await hashPassword(password),
        name: "Administrator",
        active: true,
      });
      console.log(`Seeded admin account: ${email}`);
    }
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
