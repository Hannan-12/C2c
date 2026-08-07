import Link from "next/link";
import { getPricedRoutes } from "@/lib/routes-catalogue";

/**
 * The route board — the page's signature element.
 *
 * A chauffeur's rate card as a ruled, tabular slab: the routes people actually
 * ask for, with distance, drive time and starting fare in aligned figures.
 * Every row is a link that prefills the booking form, so the board is a
 * conversion path rather than decoration.
 */
export async function RouteBoard() {
  const routes = await getPricedRoutes();

  return (
    <section
      aria-labelledby="route-board-heading"
      className="rounded-card bg-dock text-ink-inverse overflow-hidden"
    >
      <header className="flex items-baseline justify-between gap-4 px-5 sm:px-6 pt-5 pb-4">
        <h2
          id="route-board-heading"
          className="display text-sm uppercase tracking-[0.14em] text-ink-inverse"
        >
          Popular routes
        </h2>
        <p className="text-[11px] uppercase tracking-widest text-ink-inverse/40">
          From / Comfort
        </p>
      </header>

      <ul className="border-t border-dock-border">
        {routes.map((route) => (
          <li key={`${route.from}-${route.to}`}>
            <Link
              href={{
                pathname: "/book",
                query: { serviceType: "ride", pickup: route.from, dropoff: route.to },
              }}
              className="group relative flex items-center gap-4 px-5 sm:px-6 py-3.5
                         border-b border-dock-border overflow-hidden
                         transition-colors duration-300
                         ease-out-soft
                         hover:bg-white/6"
            >
              {/* Accent rail wipes in from the left on hover. */}
              <span
                aria-hidden
                className="absolute left-0 inset-y-0 w-0.5 bg-accent origin-top
                           scale-y-0 transition-transform duration-300
                           ease-out-soft
                           group-hover:scale-y-100"
              />

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium truncate">
                  {route.from}
                  <span className="text-accent mx-1.5" aria-hidden>
                    →
                  </span>
                  {route.to}
                </span>
                <span className="tnum block text-[11px] text-ink-inverse/45 mt-0.5">
                  {route.distanceKm} km · {route.durationMin} min
                </span>
              </span>

              <span
                className="tnum shrink-0 text-right font-mono text-sm font-medium text-accent
                           transition-transform duration-300
                           ease-out-soft
                           group-hover:scale-105"
              >
                {route.currency} {route.fromFare}
              </span>

              <span
                className="shrink-0 text-ink-inverse/25 transition-[color,transform]
                           duration-300 ease-out-soft
                           group-hover:text-accent group-hover:translate-x-1"
                aria-hidden
              >
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="px-5 sm:px-6 py-3.5 text-[11px] leading-relaxed text-ink-inverse/40">
        Starting fares for the Comfort class. Your exact fare is calculated from
        your own route before you submit.
      </p>
    </section>
  );
}
