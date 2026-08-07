import type { MetadataRoute } from "next";
import { canonical } from "@/lib/seo";

/**
 * Public routes only.
 *
 * Deliberately excludes /admin (gated) and /track/[reference] — those URLs are
 * unauthenticated and expose customer PII, so they must never be submitted for
 * indexing. /track itself is the code-entry form and is safe.
 */
const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/book", priority: 0.9, changeFrequency: "monthly" },
  { path: "/airport-rides", priority: 0.8, changeFrequency: "monthly" },
  { path: "/city-tour", priority: 0.8, changeFrequency: "monthly" },
  { path: "/car-rentals", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faqs", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about-us", priority: 0.5, changeFrequency: "yearly" },
  { path: "/contact-us", priority: 0.5, changeFrequency: "yearly" },
  { path: "/track", priority: 0.4, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ROUTES.map((route) => ({
    url: canonical(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
