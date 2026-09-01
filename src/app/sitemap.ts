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
  { path: "/rides", priority: 0.8, changeFrequency: "monthly" },
  { path: "/airport-rides", priority: 0.8, changeFrequency: "monthly" },
  { path: "/city-tour", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faqs", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about-us", priority: 0.5, changeFrequency: "yearly" },
  { path: "/contact-us", priority: 0.5, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/refunds", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/track", priority: 0.4, changeFrequency: "yearly" },
];

/**
 * No lastModified, deliberately.
 *
 * It used to be `new Date()` evaluated per request, so every URL claimed to
 * have changed the instant the sitemap was fetched — all twelve of them, every
 * time. Google's guidance is that it ignores lastmod unless the value is
 * consistently accurate, and a sitemap where the whole site changes every
 * second is the clearest possible signal that ours was not.
 *
 * That matters more than it sounds for a site sitting in "Discovered —
 * currently not indexed": lastmod is one of the few hints Google uses to
 * decide which known URLs are worth fetching next, and a dishonest one is
 * worse than none, because it teaches the crawler to disregard the file.
 *
 * Omitted rather than hand-maintained. A date typed into this list would be
 * accurate on the day it was written and wrong within a month, which is how
 * the field became untrustworthy in the first place.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({
    url: canonical(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
