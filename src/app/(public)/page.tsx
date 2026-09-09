import Link from "next/link";
import Image from "next/image";
import { LocalBusinessSchema } from "@/components/structured-data";
import { DestinationSlider } from "@/components/destination-slider";
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

      {/*
        The hero is a full-bleed band, not a page section with a picture behind
        it.

        Negative margins cancel the page's own padding on all four relevant
        sides, so the photograph starts at the very top of the content area and
        runs to both edges; the padding is then put back on the inner container
        so the text keeps its alignment with everything below. An image inset
        from the edges reads as an illustration of the page — this one has to
        read as the page.

        next/image rather than a CSS background: it produces the responsive
        variants that keep a 2400px photograph off a phone's data plan, and
        `priority` because this is the largest element on first paint and the
        one that decides the page's LCP.
      */}
      <section className="relative -mx-6 sm:-mx-10 lg:-mx-14 -mt-10 lg:-mt-14 mb-4">
        <div className="relative min-h-[30rem] lg:min-h-[38rem] flex items-center overflow-hidden">
          <Image
            src="/images/hero-chauffeur-suv.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />

          {/*
            A dark scrim with light text, rather than a pale wash with dark
            text.

            The pale version was the obvious first move and it was wrong: a
            light wash over a photograph does not dim it, it greys it — the
            blacks lift, the colour drains, and the picture reads as faded
            rather than as a background. Darkening does the opposite. It holds
            the blacks, keeps the car and the uniform saturated, and gives light
            text far more contrast than dark text ever had, so less coverage is
            needed to stay readable.

            Still weighted to where the words are: heaviest on the left where
            the headline sits, thinning towards the right where the car is.
            Vertical below `sm`, because on a phone the text spans most of the
            width and a left-weighted wash would strand the end of every line
            on bare photograph.
          */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-dock/88 via-dock/72 to-dock/60
                       sm:bg-gradient-to-r sm:from-dock/90 sm:via-dock/60 sm:to-dock/15"
          />

          {/* A short fade at the very bottom so the band meets the page without a hard line. */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-canvas" />

          <div className="relative w-full px-6 sm:px-10 lg:px-14 py-14">
            <div className="max-w-xl">
              <p
                className="animate-rise text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-inverse/70 mb-6"
                style={{ animationDelay: "40ms" }}
              >
                Chauffeur service · United Arab Emirates
              </p>

              <h1
                className="animate-rise display text-[2.75rem] sm:text-6xl leading-[0.95] mb-6 text-ink-inverse"
                style={{ animationDelay: "120ms" }}
              >
                Booked by you.
                <br />
                Confirmed by
                <br />
                <span className="text-accent">a person.</span>
              </h1>

              <p
                className="animate-rise text-ink-inverse/85 text-lg leading-relaxed mb-8"
                style={{ animationDelay: "220ms" }}
              >
                No dispatch algorithm deciding who turns up. Send us your route
                and someone confirms the driver, the car and the fare with you
                directly — usually within the hour.
              </p>

              <div
                className="animate-rise flex flex-wrap gap-3"
                style={{ animationDelay: "320ms" }}
              >
                <Link href="/book" className="btn-primary">
                  Book a ride
                </Link>
                {/*
                  Not btn-secondary: that outline is drawn for the light page
                  background and disappears on a dark photograph.
                */}
                <Link
                  href="/track"
                  className="rounded-field border border-ink-inverse/35 bg-ink-inverse/10 px-5 py-3
                             text-sm font-semibold text-ink-inverse backdrop-blur-sm
                             hover:bg-ink-inverse/20 transition-colors"
                >
                  Track a booking
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*
        A single clickable strip rather than a card grid — one offer, so it
        reads as an announcement rather than another tile competing with the
        services below it.
      */}
      <Link
        href="/book?serviceType=ride"
        className="reveal group mt-10 flex items-center gap-4 rounded-card bg-accent
                   px-6 py-5 sm:px-8 sm:py-6 transition-[transform,background-color]
                   duration-300 ease-out-soft hover:-translate-y-0.5 hover:bg-accent-strong"
      >
        <div className="flex-1">
          <p className="font-semibold text-ink text-base sm:text-lg">
            Booking a return? Get 20% off the ride back.
          </p>
          <p className="text-sm text-ink/70 mt-0.5">
            Tell us both legs when you book and the discount is applied on the spot.
          </p>
        </div>
        <span
          className="shrink-0 text-ink font-semibold text-sm flex items-center gap-1.5
                     transition-transform duration-300 ease-out-soft group-hover:translate-x-1"
        >
          Book now
          <span aria-hidden>→</span>
        </span>
      </Link>

      {/* Ruled index rather than cards — different rhythm from the hero above. */}
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
