import { BRAND, BUSINESS, canonical, siteUrl } from "@/lib/seo";

/**
 * JSON-LD structured data (docs Section 9).
 *
 * Emitted as a script tag rather than through metadata, because Next's
 * metadata API has no schema.org field. Every value is derived from the same
 * BUSINESS constant the pages render, so the markup cannot describe a phone
 * number or an opening time that differs from what a visitor sees — the
 * mismatch search engines penalise.
 */

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * The organisation itself. Produces the business panel in search results.
 *
 * TODO(client): a postal address is still missing. Google shows a richer panel
 * with one, but a made-up address is worse than none, so the field is omitted
 * rather than filled. `areaServed` carries the coverage in the meantime.
 */
export function LocalBusinessSchema() {
  const telephone = BUSINESS.whatsapp ? `+${BUSINESS.whatsapp}` : undefined;
  const [, dailyHours = "00:00-23:59"] = BUSINESS.openingHours.split(" ");
  const [opens, closes] = dailyHours.split("-");
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": `${siteUrl()}/#business`,
        name: BRAND,
        url: siteUrl(),
        image: `${siteUrl()}/images/logo-badge.png`,
        logo: `${siteUrl()}/images/logo-badge.png`,
        description:
          "Chauffeur rides, airport transfers, city tours and hourly hire across Dubai, Abu Dhabi and Sharjah. Every booking is confirmed by a person.",
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
          opens,
          closes,
        },
        ...(telephone ? { telephone } : {}),
        email: BUSINESS.email,
        currenciesAccepted: "AED",
        paymentAccepted: "Cash, Credit Card, Bank Transfer",
        areaServed: BUSINESS.areasServed.map((area) => ({
          "@type": "City",
          name: area,
        })),
        ...(telephone || BUSINESS.email
          ? {
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                ...(telephone ? { telephone } : {}),
                ...(BUSINESS.email ? { email: BUSINESS.email } : {}),
                availableLanguage: ["English"],
                areaServed: "AE",
              },
            }
          : {}),
      }}
    />
  );
}

/**
 * A single service, tied back to the business by @id so search engines read
 * them as one entity rather than several unrelated things.
 */
export function ServiceSchema({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name,
        description,
        url: canonical(path),
        serviceType: name,
        provider: {
          "@type": "LocalBusiness",
          "@id": `${siteUrl()}/#business`,
          name: BRAND,
        },
        areaServed: BUSINESS.areasServed.map((area) => ({
          "@type": "City",
          name: area,
        })),
        availableChannel: {
          "@type": "ServiceChannel",
          serviceUrl: canonical("/book"),
          availableLanguage: ["English"],
        },
      }}
    />
  );
}

/**
 * Breadcrumbs for service pages. Cheap to emit and Google renders them in
 * place of the raw URL, which reads better in a result.
 */
export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; path: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: canonical(item.path),
        })),
      }}
    />
  );
}
