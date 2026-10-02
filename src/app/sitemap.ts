import type { MetadataRoute } from "next";
import { canonical } from "@/lib/seo";
import { TRANSFERS } from "@/data/transfers";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { vehiclePricing } from "@/db/schema";

export const revalidate = 3600;

/**
 * Public routes only.
 *
 * Deliberately excludes /admin (gated) and /track/[reference] — those URLs are
 * unauthenticated and expose customer PII, so they must never be submitted for
 * indexing. /track itself is the code-entry form and is safe.
 */
const ROUTES = ["/", "/book", "/rides", "/airport-rides", "/transfers", "/city-tour", "/faqs", "/about-us", "/contact-us", "/terms", "/refunds", "/privacy", "/track", ...TRANSFERS.map(({ slug }) => `/transfers/${slug}`)];

/**
 * Route page dates are maintained explicitly so the transfer pages have a
 * stable lastModified value rather than claiming to change on every request.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap();
}

async function buildSitemap(): Promise<MetadataRoute.Sitemap> {
  let latestRateUpdate: Date | undefined;
  try {
    const [latest] = await db
      .select({ updatedAt: vehiclePricing.updatedAt })
      .from(vehiclePricing)
      .orderBy(desc(vehiclePricing.updatedAt))
      .limit(1);
    latestRateUpdate = latest?.updatedAt ?? undefined;
  } catch {
    // The sitemap remains available during a database outage or an empty setup.
  }

  return ROUTES.map((path) => ({
    url: canonical(path),
    lastModified: path === "/transfers" || path.startsWith("/transfers/")
      ? latestRateUpdate ?? "2026-10-02"
      : "2026-10-02",
  }));
}
