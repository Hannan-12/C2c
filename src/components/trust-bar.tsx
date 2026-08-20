import { BUSINESS } from "@/lib/seo";
import { FREE_CANCEL_HOURS, WAIT_AIRPORT_MIN } from "@/lib/service-terms";

/**
 * The promises worth knowing before committing to a booking, as a slow
 * marquee.
 *
 * Every claim is one the business already makes somewhere it can be held to
 * it: the cancellation window and the airport waiting allowance come from
 * lib/service-terms.ts, which /terms renders as well, and the opening hours
 * and human confirmation are already in the LocalBusiness structured data.
 * Nothing here is new — it surfaces existing commitments where they matter.
 *
 * Two claims competitors make are deliberately absent. "Real-time flight
 * monitoring" would be untrue: we record a flight number and nothing watches
 * it. "Certified chauffeurs" is unverified, and a claim about a driver's
 * licensing is not one to make on a supplier's behalf without evidence. Both
 * are one array entry away once they are true.
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
    title: "One agreed fare",
    copy: "Quoted before you book. No meter, no surge.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5h5M9.5 14.5h5M12 7v10" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Reach us any time",
    copy: `We answer on WhatsApp ${BUSINESS.openingHoursLabel}.`,
    icon: (
      <>
        <path d="M21 15a2 2 0 01-2 2H8l-4 3V6a2 2 0 012-2h13a2 2 0 012 2z" strokeLinejoin="round" />
      </>
    ),
  },
];

function Promise({ title, copy, icon }: (typeof PROMISES)[number]) {
  return (
    <div className="flex w-72 shrink-0 gap-3 px-5">
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="size-5 shrink-0 stroke-accent-strong fill-none"
        strokeWidth="1.6"
      >
        {icon}
      </svg>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="mt-1 text-[13px] leading-snug text-ink-muted">{copy}</p>
      </div>
    </div>
  );
}

export function TrustBar() {
  return (
    <section aria-label="What's included" className="mb-8 border-y border-line py-5">
      {/*
        The list is rendered twice on one track. The animation translates by
        exactly half the track, so at the moment it resets the second copy sits
        where the first began and the loop has no visible seam.

        Only the first copy is in the accessibility tree; the clone is a
        rendering artefact and a screen reader hearing every promise twice
        would be worse than no marquee at all.
      */}
      <div className="marquee-track overflow-hidden">
        <div className="animate-marquee flex w-max">
          {PROMISES.map((promise) => (
            <Promise key={promise.title} {...promise} />
          ))}
          <div className="marquee-clone flex" aria-hidden>
            {PROMISES.map((promise) => (
              <Promise key={promise.title} {...promise} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
