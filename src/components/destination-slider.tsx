"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

/**
 * Where people actually go, as a scrollable rail.
 *
 * Only places the business serves. `areasServed` is Dubai, Abu Dhabi and
 * Sharjah, so the neighbouring emirates are absent however good the
 * photographs would be — a destination card is an offer to drive someone
 * there.
 *
 * No prices. Competitors put a "from" figure on each card, but a fare depends
 * on where the trip starts, and a number that changes the moment a customer
 * enters a pickup would be a bait rather than a quote. Each card carries the
 * destination into the booking form instead, where it gets a real fare.
 */
const DESTINATIONS: {
  name: string;
  copy: string;
  image: string;
  href: string;
}[] = [
  {
    name: "Downtown Dubai",
    copy: "Burj Khalifa, Dubai Mall and the fountain.",
    image: "/images/destinations/downtown-dubai.jpg",
    href: "/transfers/dubai-airport-to-downtown-dubai",
  },
  {
    name: "Dubai Marina",
    copy: "The Walk, JBR beach and the marina towers.",
    image: "/images/destinations/dubai-marina.jpg",
    href: "/transfers/dubai-airport-to-dubai-marina",
  },
  {
    name: "Palm Jumeirah",
    copy: "Atlantis, the resorts and the fronds.",
    image: "/images/destinations/palm-jumeirah.jpg",
    href: "/transfers/dubai-airport-to-palm-jumeirah",
  },
  {
    name: "Burj Al Arab",
    copy: "Jumeirah beach road and the hotel drive.",
    image: "/images/destinations/burj-al-arab.jpg",
    href: "/book?dropoff=Burj+Al+Arab%2C+Jumeirah",
  },
  {
    name: "Dubai Creek",
    copy: "Deira, the gold and spice souks, the abra stations.",
    image: "/images/destinations/dubai-creek.jpg",
    href: "/book?dropoff=Dubai+Creek%2C+Deira",
  },
  {
    name: "Dubai International",
    copy: "Ask the team to confirm your airport pickup point.",
    image: "/images/airport.jpg",
    href: "/airport-rides",
  },
  {
    name: "Abu Dhabi",
    copy: "Sheikh Zayed Grand Mosque, the Corniche and Yas Island.",
    image: "/images/destinations/abu-dhabi.jpg",
    href: "/transfers/dubai-to-abu-dhabi",
  },
  {
    name: "Sharjah",
    copy: "Al Majaz waterfront, the museums and the souks.",
    image: "/images/destinations/sharjah.jpg",
    href: "/transfers/dubai-airport-to-sharjah",
  },
];

/** Gap between advances. Hovering, focusing or touching the rail pauses it. */
const ADVANCE_MS = 2500;

export function DestinationSlider() {
  const rail = useRef<HTMLUListElement>(null);
  const paused = useRef(false);

  function step(el: HTMLUListElement) {
    // One card plus its gap, measured rather than hardcoded, so the step stays
    // right when the card width changes at a breakpoint.
    const card = el.querySelector("li");
    return card ? card.getBoundingClientRect().width + 16 : el.clientWidth;
  }

  function scrollBy(direction: 1 | -1) {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: step(el) * direction, behavior: "smooth" });
  }

  /**
   * Advance on its own, so the rail reads as a rail rather than a row that
   * happens to overflow. Five cards only just exceed the column on a wide
   * screen, so without this the arrows nudge it a few pixels and look broken.
   *
   * A ref rather than state for the pause flag: this changes on every hover
   * and nothing renders differently for it, so state would only cost renders.
   */
  useEffect(() => {
    const el = rail.current;
    if (!el) return;

    // Anyone who asked their OS for less motion does not get a carousel that
    // moves by itself. The arrows and swiping still work.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) return;

    const timer = setInterval(() => {
      if (paused.current) return;
      // 4px of slack: scrollWidth and the sum of offsets disagree by a
      // fraction after a smooth scroll, and an exact test never fires.
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step(el), behavior: "smooth" });
    }, ADVANCE_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="reveal mt-20" aria-labelledby="destinations-heading">
      <div className="flex items-end justify-between gap-6 mb-7">
        <div>
          <h2 id="destinations-heading" className="display text-2xl sm:text-3xl mb-1.5">
            Where we drive
          </h2>
          <p className="text-ink-muted">
            Pick a destination and we&apos;ll price the trip from your pickup.
          </p>
        </div>

        {/*
          Arrows for pointer users; touch users swipe, and the rail scrolls
          natively either way. Hidden below lg because a thumb does not need
          them and they would only take room from the cards.
        */}
        <div className="hidden lg:flex gap-2 shrink-0">
          {([-1, 1] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              onClick={() => scrollBy(direction)}
              aria-label={direction === -1 ? "Scroll left" : "Scroll right"}
              className="grid size-10 place-items-center rounded-full border border-line
                         transition-colors duration-200 hover:bg-surface"
            >
              <svg viewBox="0 0 24 24" className="size-4 stroke-current fill-none" strokeWidth="2">
                <path
                  d={direction === -1 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/*
        A native scroll container with snap points rather than a JS carousel:
        it works before hydration, respects a trackpad and a touchscreen, and
        the arrows only nudge scrollLeft.
      */}
      <ul
        ref={rail}
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => (paused.current = false)}
        onFocusCapture={() => (paused.current = true)}
        onBlurCapture={() => (paused.current = false)}
        onTouchStart={() => (paused.current = true)}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none
                   -mx-6 px-6 sm:-mx-10 sm:px-10 lg:-mx-14 lg:px-14 pb-2"
      >
        {DESTINATIONS.map((place) => (
          <li key={place.name} className="snap-start shrink-0 w-64 sm:w-80">
            <Link
              href={place.href}
              className="group block overflow-hidden rounded-card border border-line bg-surface
                         transition-[box-shadow,transform] duration-200 ease-out-soft
                         hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="relative block aspect-[9/6] bg-dock">
                <Image
                  src={place.image}
                  alt={`${place.name} destination in the UAE`}
                  fill
                  sizes="(min-width: 640px) 20rem, 16rem"
                  className="object-cover transition-transform duration-500 ease-out-soft
                             group-hover:scale-[1.03]"
                />
              </span>
              <span className="block p-4">
                <span className="block font-semibold">{place.name}</span>
                <span className="mt-1 block text-[13px] leading-snug text-ink-muted">
                  {place.copy}
                </span>
                <span className="mt-3 block text-[13px] font-semibold text-accent-strong">
                  Get a fare →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
