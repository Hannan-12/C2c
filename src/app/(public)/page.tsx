import Link from "next/link";
import { Suspense } from "react";
import { RouteBoard } from "@/components/route-board";
import { LocalBusinessSchema } from "@/components/structured-data";
import { DestinationSlider } from "@/components/destination-slider";
import { FleetTable } from "@/components/fleet-table";
import { canonical } from "@/lib/seo";

/**
 * The homepage declared no canonical at all, inheriting a root layout that
 * sets none — so with www serving an identical copy, nothing on the page said
 * which of the two was the real one. Every other page carries a canonical
 * through pageMetadata; this one was missed precisely because it needs no
 * title or description of its own.
 *
 * Only the canonical is set here. Title, description and Open Graph are
 * deliberately left to the root layout, which already writes the homepage's
 * versions of them — repeating them would create a second place to keep in
 * step.
 */
export const metadata = {
  alternates: { canonical: canonical("/") },
};

/** Pricing changes rarely; an hour-old board is fine and keeps the page fast. */
export const revalidate = 3600;

const SERVICES = [
  {
    href: "/rides",
    label: "Rides",
    copy: "Point-to-point, anywhere in the Emirates",
    detail: "Fixed fare, quoted before you book",
  },
  {
    href: "/airport-rides",
    label: "Airport transfers",
    copy: "DXB, DWC, AUH and Sharjah",
    detail: "Flight number on file, so we track delays",
  },
  {
    href: "/city-tour",
    label: "City tours",
    copy: "A driver for the day, on your route",
    detail: "Priced by the hour, not the meter",
  },
];

const STEPS = [
  { title: "Send your route", copy: "Pickup, destination, time. Takes a minute." },
  { title: "We confirm on WhatsApp", copy: "A person checks availability and the fare." },
  { title: "Driver assigned", copy: "You get their name and number before pickup." },
  { title: "Track to the door", copy: "Your reference code shows live status." },
];

export default function HomePage() {
  return (
    <div className="relative overflow-x-clip px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      <LocalBusinessSchema />

      {/* Ambient warmth behind the hero. Purely decorative, never interactive. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 size-152
                   rounded-full bg-accent/12 blur-3xl animate-drift"
      />

      <section className="relative grid xl:grid-cols-[minmax(0,1fr)_400px] gap-10 xl:gap-14 items-start">
        <div className="max-w-xl">
          <p
            className="animate-rise text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint mb-6"
            style={{ animationDelay: "40ms" }}
          >
            Chauffeur service · United Arab Emirates
          </p>

          <h1
            className="animate-rise display text-[2.75rem] sm:text-6xl leading-[0.95] mb-6"
            style={{ animationDelay: "120ms" }}
          >
            Booked by you.
            <br />
            Confirmed by
            <br />
            <span className="text-accent-strong">a person.</span>
          </h1>

          <p
            className="animate-rise text-ink-muted text-lg leading-relaxed mb-8"
            style={{ animationDelay: "220ms" }}
          >
            No dispatch algorithm deciding who turns up. Send us your route and
            someone confirms the driver, the car and the fare with you directly —
            usually within the hour.
          </p>

          <div
            className="animate-rise flex flex-wrap gap-3"
            style={{ animationDelay: "320ms" }}
          >
            <Link href="/book" className="btn-primary">
              Book a ride
            </Link>
            <Link href="/track" className="btn-secondary">
              Track a booking
            </Link>
          </div>
        </div>

        <div className="animate-rise" style={{ animationDelay: "420ms" }}>
          <Suspense
            fallback={
              <div className="rounded-card bg-dock h-105 animate-pulse" aria-hidden />
            }
          >
            <RouteBoard />
          </Suspense>
        </div>
      </section>

      {/* Ruled index rather than cards — different rhythm from the board above. */}
      <section className="reveal mt-20" aria-labelledby="services-heading">
        <h2 id="services-heading" className="display text-2xl sm:text-3xl mb-1.5">
          What we run
        </h2>
        <p className="text-ink-muted mb-7">
          Three services, all confirmed the same way. Always a luxury car with a professional driver — never self-drive.
        </p>

        <ul className="border-t border-line">
          {SERVICES.map((service) => (
            <li key={service.href}>
              <Link
                href={service.href}
                className="group grid sm:grid-cols-[220px_1fr_auto] items-baseline gap-x-6 gap-y-1
                           border-b border-line py-5 px-3 -mx-3 rounded-field
                           transition-[background-color,transform] duration-300
                           ease-out-soft
                           hover:bg-surface hover:translate-x-1"
              >
                <span className="display text-lg group-hover:text-accent-strong transition-colors">
                  {service.label}
                </span>
                <span className="text-sm text-ink-muted">
                  {service.copy}
                  <span className="block text-ink-faint text-xs mt-0.5">
                    {service.detail}
                  </span>
                </span>
                <span
                  className="hidden sm:block text-ink-faint transition-[color,transform]
                             duration-300 ease-out-soft
                             group-hover:text-accent group-hover:translate-x-1.5"
                  aria-hidden
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="reveal mt-20" aria-labelledby="fleet-heading">
        <h2 id="fleet-heading" className="display text-2xl sm:text-3xl mb-1.5">
          The fleet
        </h2>
        <p className="text-ink-muted mb-7">
          Pick a class when you book. Starting fares shown.
        </p>

        <Suspense
          fallback={
            <div className="rounded-card bg-dock h-72 animate-pulse" aria-hidden />
          }
        >
          <FleetTable />
        </Suspense>
      </section>

      <DestinationSlider />

      {/* Numbered because the order is real — each step depends on the last. */}
      <section className="reveal mt-20 mb-6" aria-labelledby="how-heading">
        <h2 id="how-heading" className="display text-2xl sm:text-3xl mb-7">
          How a booking works
        </h2>

        <ol className="grid gap-x-8 gap-y-7 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className="tnum block font-mono text-xs text-accent-strong mb-2.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{step.copy}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
