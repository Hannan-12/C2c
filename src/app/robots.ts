import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        // Tracking URLs are unauthenticated and return customer PII — name,
        // WhatsApp number, pickup address, driver details. A crawled reference
        // code would put that in a search index, so they are excluded here as
        // well as omitted from the sitemap.
        "/track/",
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
