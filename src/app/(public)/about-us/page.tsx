import Link from "next/link";
import { BUSINESS, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "About Us",
  description:
    "Ride On Click is a new chauffeur service in Dubai, Abu Dhabi and Sharjah. Every booking is confirmed by a person, not an algorithm.",
  path: "/about-us",
});

/**
 * TODO(client): replace or extend with the real story once there is one to
 * tell — start date, fleet size, driver count, languages spoken.
 *
 * Written deliberately as a new business rather than implying a history that
 * does not exist. No claims about years of service, number of rides completed
 * or partner networks appear anywhere on this page: a customer who checks and
 * finds them untrue is worse than one who was never told.
 */
export default function AboutPage() {
  return (
    <div className="relative overflow-x-clip px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 size-152
                   rounded-full bg-accent/12 blur-3xl animate-drift"
      />

      <section className="relative max-w-2xl">
        <p
          className="animate-rise text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint mb-6"
          style={{ animationDelay: "40ms" }}
        >
          About us
        </p>

        <h1
          className="animate-rise display text-[2.5rem] sm:text-5xl leading-[0.98] mb-6"
          style={{ animationDelay: "120ms" }}
        >
          A new service,
          <br />
          run the
          <br />
          <span className="text-accent-strong">old way.</span>
        </h1>

        <div
          className="animate-rise text-ink-muted text-lg leading-relaxed space-y-5"
          style={{ animationDelay: "220ms" }}
        >
          <p>
            Ride On Click is new. We started because booking a car in the UAE
            had become something you do at an app and hope about — a price that
            moves while you watch it, a driver assigned by software, and nobody
            to ask when something changes.
          </p>
          <p>
            So we run it the other way round. You send us a route and a person
            reads it. That person checks the car is free and the driver is
            available, agrees the fare with you on WhatsApp, and stays reachable
            until you&apos;re where you were going. The website does the
            arithmetic; a human does the promising.
          </p>
          <p>
            We cover {BUSINESS.areasServed.join(", ")}, {BUSINESS.openingHoursLabel}.
            Being new means we have fewer cars than the large operators and no
            call centre. It also means the person who confirms your booking is
            the person who answers when you message back.
          </p>
        </div>
      </section>

      <section className="reveal mt-20" aria-labelledby="how-heading">
        <h2 id="how-heading" className="display text-2xl sm:text-3xl mb-7">
          What we hold ourselves to
        </h2>

        <ul className="border-t border-line">
          {[
            {
              title: "The fare doesn't move",
              copy: "Agreed before the trip, not recalculated after it. No surge, no meter surprises.",
            },
            {
              title: "A person, every time",
              copy: "Every booking is confirmed by someone who checked. If plans change, you're talking to a human, not a form.",
            },
            {
              title: "You know the driver",
              copy: "Name and number before pickup, on your tracking page and over WhatsApp.",
            },
            {
              title: "We say no when we should",
              copy: "If we can't cover a booking properly, we'll tell you rather than accept it and hope.",
            },
          ].map((item) => (
            <li
              key={item.title}
              className="grid sm:grid-cols-[minmax(0,15rem)_1fr] gap-x-8 gap-y-1
                         border-b border-line py-5"
            >
              <h3 className="font-semibold flex items-baseline gap-2.5">
                <span className="size-1.5 rounded-full bg-accent shrink-0" aria-hidden />
                {item.title}
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed max-w-xl">
                {item.copy}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="reveal mt-20 mb-6">
        <div className="rounded-card bg-dock text-ink-inverse p-8 sm:p-10">
          <h2 className="display text-2xl sm:text-3xl mb-2">Try us once</h2>
          <p className="text-ink-inverse/70 mb-7 max-w-lg leading-relaxed">
            Send a route and see how the booking is handled. That&apos;s the
            whole pitch.
          </p>
          <Link href="/book" className="btn-primary">
            Get a fare
          </Link>
        </div>
      </section>
    </div>
  );
}
