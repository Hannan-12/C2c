import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TRANSFER_BY_SLUG, TRANSFERS, transferMetaDescription } from "@/data/transfers";
import { BreadcrumbSchema } from "@/components/structured-data";
import { pageMetadata, canonical, BUSINESS } from "@/lib/seo";
import { FaqList } from "@/components/service-page";
import { getTransferFareSummary } from "@/lib/transfer-pricing";
import { formatTransferFare, transferFareJsonLd } from "@/lib/transfer-fare-summary";
import { FREE_CANCEL_HOURS, FREE_CANCEL_HOURS_UNIT, WAIT_AIRPORT_MIN, WAIT_STANDARD_MIN } from "@/lib/service-terms";

export const revalidate = 3600;

export function generateStaticParams() {
  return TRANSFERS.map(({ slug }) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const route = TRANSFER_BY_SLUG[slug];
  if (!route) return {};
  const summary = await getTransferFareSummary(route.pickup, route.dropoff);
  return pageMetadata({
    title: route.title,
    description: transferMetaDescription(route, summary?.fromFare),
    path: `/transfers/${route.slug}`,
  });
}

export default async function TransferPage({ params }: Props) {
  const { slug } = await params;
  const route = TRANSFER_BY_SLUG[slug];
  if (!route) notFound();

  const path = `/transfers/${route.slug}`;
  const bookingHref = `/book?${new URLSearchParams({ pickup: route.pickup, dropoff: route.dropoff }).toString()}`;
  const summary = await getTransferFareSummary(route.pickup, route.dropoff);
  const aggregateOffer = transferFareJsonLd(summary);
  const isAirportPickup = route.pickup.toLowerCase().includes("airport");
  const relatedServiceHref = isAirportPickup ? "/airport-rides" : "/rides";
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: route.title,
    description: transferMetaDescription(route, summary?.fromFare),
    url: canonical(path),
    serviceType: "Private chauffeur transfer",
    provider: { "@type": "LocalBusiness", "@id": `${canonical("/")}#business` },
    areaServed: BUSINESS.areasServed.map((name) => ({ "@type": "City", name })),
    ...(aggregateOffer ? { offers: aggregateOffer } : {}),
  };
  const schema = [
    serviceSchema,
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: route.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
    },
  ];

  return (
    <main className="relative overflow-x-clip px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      {schema.map((item) => <script key={item["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }} />)}
      <BreadcrumbSchema items={[{ name: "Home", path: "/" }, { name: "Transfers", path: "/transfers" }, { name: route.h1, path }]} />
      <section className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint mb-6">Private chauffeur · UAE</p>
        <h1 className="display text-[2.5rem] sm:text-5xl leading-[0.98] mb-6">{route.h1}</h1>
        <div className="text-ink-muted text-lg leading-relaxed space-y-5 mb-8">{route.intro.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
        <p className="text-sm text-ink-muted mb-6"><strong className="text-ink">{summary ? `From ${formatTransferFare(summary.fromFare)}` : "Fixed fare quoted before you book"}</strong> <span className="mx-2">·</span>{route.travelTime}</p>
        <div className="flex flex-wrap gap-3 mb-16"><Link href={bookingHref} className="btn-primary">Get a confirmed fare</Link><Link href={relatedServiceHref} className="btn-secondary">{isAirportPickup ? "Airport transfers" : "Chauffeur rides"}</Link></div>
      </section>
      <section className="reveal mt-2" aria-labelledby="vehicle-options">
        <h2 id="vehicle-options" className="display text-2xl sm:text-3xl mb-5">Vehicle options</h2>
        <ul className="flex flex-wrap gap-3">{route.vehicleOptions.map((vehicle) => <li key={vehicle} className="rounded-field border border-line bg-surface px-4 py-3 text-sm">{vehicle}</li>)}</ul>
      </section>
      {summary && (
        <section className="reveal mt-12" aria-labelledby="vehicle-fares">
          <h2 id="vehicle-fares" className="display text-2xl sm:text-3xl mb-5">Vehicle fare estimates</h2>
          <div className="rounded-card border border-line overflow-hidden">
            <table className="w-full text-sm">
              <caption className="sr-only">Current route fare estimates by vehicle</caption>
              <thead><tr className="bg-surface text-left"><th scope="col" className="px-4 py-3 font-semibold">Vehicle</th><th scope="col" className="px-4 py-3 text-right font-semibold">Fare</th></tr></thead>
              <tbody>{summary.vehicles.map((vehicle) => <tr key={vehicle.category} className="border-t border-line"><th scope="row" className="px-4 py-3 text-left font-medium">{vehicle.vehicle}</th><td className="px-4 py-3 text-right font-mono">{formatTransferFare(vehicle.amount)}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-faint">Route estimates use the listed pickup and drop-off. Your exact addresses can change the fare.</p>
        </section>
      )}
      <section className="reveal mt-16" aria-labelledby="transfer-included">
        <h2 id="transfer-included" className="display text-2xl sm:text-3xl mb-5">What is included</h2>
        <ul className="border-t border-line">
          <li className="border-b border-line py-4 text-sm text-ink-muted">{isAirportPickup ? `${WAIT_AIRPORT_MIN} minutes of airport waiting, measured from when you land.` : `${WAIT_STANDARD_MIN} minutes of waiting at an ordinary pickup.`}</li>
          <li className="border-b border-line py-4 text-sm text-ink-muted">Free cancellation up to {FREE_CANCEL_HOURS} {FREE_CANCEL_HOURS_UNIT} before pickup.</li>
          <li className="border-b border-line py-4 text-sm text-ink-muted">A person confirms availability and the fare with you over WhatsApp before booking.</li>
        </ul>
        {/* TODO(client): confirm terminal pickup arrangements and toll inclusion before adding specifics. */}
      </section>
      <section className="reveal mt-16" aria-labelledby="transfer-faqs">
        <h2 id="transfer-faqs" className="display text-2xl sm:text-3xl mb-7">Common questions</h2>
        <FaqList items={route.faqs} />
      </section>
      <section className="reveal mt-16 mb-6 rounded-card bg-dock text-ink-inverse p-8 sm:p-10">
        <h2 className="display text-2xl sm:text-3xl mb-2">Plan this transfer</h2>
        <p className="text-ink-inverse/70 mb-7">Share your pickup details, timing and vehicle preference. The team confirms the fare before booking.</p>
        <Link href={bookingHref} className="btn-primary">Get a fare</Link>
      </section>
      <section className="reveal mt-16" aria-labelledby="other-popular-routes">
        <h2 id="other-popular-routes" className="display text-2xl sm:text-3xl mb-5">Other popular routes</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRANSFERS.filter((item) => item.slug !== route.slug).slice(0, 3).map((item) => (
            <li key={item.slug}><Link className="block rounded-field border border-line bg-surface px-4 py-3 text-sm font-medium hover:text-accent-strong" href={`/transfers/${item.slug}`}>{item.h1} →</Link></li>
          ))}
        </ul>
      </section>
    </main>
  );
}
