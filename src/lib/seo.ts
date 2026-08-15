import type { Metadata } from "next";

/**
 * Shared SEO configuration (docs Section 9).
 *
 * Business facts live here rather than being scattered through pages, because
 * the same values feed metadata, JSON-LD and the contact page — three places
 * that must never disagree about a phone number or an opening time.
 */

export const BRAND = "Ride On Click";

export const BUSINESS = {
  name: BRAND,
  /** Emirates served, in the order the client listed them. */
  areasServed: ["Dubai", "Abu Dhabi", "Sharjah"],
  /** 24/7 in schema.org's notation: all days, midnight to midnight. */
  openingHours: "Mo-Su 00:00-23:59",
  /** The same fact in prose, for page copy. */
  openingHoursLabel: "any hour, any day",
  /** Digits only, international format — shared with the wa.me links. */
  whatsapp: process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? "",
  // TODO(client): supply legal entity name, trade licence number and registered
  // address. Required before LocalBusiness JSON-LD is complete.
  /** Real mailbox on the verified domain — also the sender on booking email. */
  email: "info@rideonclick.com",
} as const;

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function canonical(path: string): string {
  return `${siteUrl()}${path === "/" ? "" : path}`;
}

/**
 * Builds a page's metadata, so every route declares the same shape and no page
 * silently ships without a canonical URL or an Open Graph card.
 */
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  /** Set for pages that must stay out of the index (unfinished legal text). */
  noindex?: boolean;
}): Metadata {
  const url = canonical(opts.path);

  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    robots: opts.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${opts.title} | ${BRAND}`,
      description: opts.description,
      url,
      siteName: BRAND,
      locale: "en_AE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${opts.title} | ${BRAND}`,
      description: opts.description,
    },
  };
}
