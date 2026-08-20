import { BUSINESS } from "@/lib/seo";
import { FREE_CANCEL_HOURS, WAIT_AIRPORT_MIN } from "@/lib/service-terms";

/**
 * The four things worth knowing before committing to a booking.
 *
 * Every claim here is one the business already makes somewhere it can be held
 * to it: the cancellation window and the airport waiting allowance come from
 * lib/service-terms.ts, which /terms renders as well, and the opening hours
 * and human confirmation are already in the LocalBusiness structured data.
 * Nothing on this strip is new — it surfaces existing commitments at the
 * moment they matter.
 *
 * Two claims competitors make are deliberately absent. "Real-time flight
 * monitoring" would be untrue: we record a flight number and nothing watches
 * it. "Certified chauffeurs" is unverified, and a claim about a driver's
 * licensing is not one to make on a supplier's behalf without evidence. Both
 * can be added the moment they are true — this list is data.
 */
const PROMISES: { title: string; copy: string; icon: React.ReactNode }[] = [
  {
    title: "Free cancellation",
    copy: `Cancel at no cost up to ${FREE_CANCEL_HOURS} hours before pickup.`,
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Airport waiting included",
    copy: `${WAIT_AIRPORT_MIN} minutes free, measured from when you land.`,
    icon: (
      <path
        d="M2 13l9-2V5a1.5 1.5 0 013 0v6l9 2v2l-9-1.5V17l3 2v2l-4.5-1.5L8 21v-2l3-2v-3.5L2 15z"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Confirmed by a person",
    copy: "No automated dispatch. Someone checks the car and the driver.",
    icon: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0114 0" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Reach us any time",
    copy: `We answer on WhatsApp ${BUSINESS.openingHoursLabel}.`,
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12h8M12 8v8" strokeLinecap="round" />
      </>
    ),
  },
];

export function TrustBar() {
  return (
    <section
      aria-label="What's included"
      className="mb-8 grid gap-x-6 gap-y-5 border-y border-line py-5
                 sm:grid-cols-2 lg:grid-cols-4"
    >
      {PROMISES.map((promise) => (
        <div key={promise.title} className="flex gap-3">
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="size-5 shrink-0 stroke-accent-strong fill-none"
            strokeWidth="1.6"
          >
            {promise.icon}
          </svg>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{promise.title}</p>
            <p className="mt-1 text-[13px] leading-snug text-ink-muted">
              {promise.copy}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
