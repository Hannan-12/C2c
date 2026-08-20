import Link from "next/link";
import { LegalList, LegalPage } from "@/components/legal-page";
import { BRAND, BUSINESS, pageMetadata } from "@/lib/seo";
import {
  FREE_CANCEL_HOURS,
  HOURLY_MINIMUM,
  LATE_CANCEL_PERCENT,
  WAIT_AIRPORT_MIN,
  WAIT_STANDARD_MIN,
} from "@/lib/service-terms";
import { formatPhone } from "@/lib/format";

export const metadata = pageMetadata({
  title: "Terms & Conditions",
  description:
    "Booking, fares, cancellations, waiting time and liability for Ride On Click chauffeur rides, hourly hire, airport transfers and car rental.",
  path: "/terms",
});

/**
 * Operational rules agreed with the client, written to be specific.
 *
 * Where a competitor leaves a rule vague ("additional charges apply"), this
 * states the mechanism, because a customer who can predict the charge is one
 * who does not dispute it later.
 *
 * TODO(client): one figure is still missing — the extra waiting rate per
 * 15-minute block. Until it is set, the text commits only to agreeing it with
 * the customer at booking, which is true and enforceable. Insert the rate and
 * the sentence can become concrete.
 *
 * Not legal advice. Should be reviewed by a lawyer before launch, alongside
 * the privacy policy.
 */

// Shared with the trust strip on /book, so the short claim and the legal
// prose cannot drift apart. See lib/service-terms.ts.

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="8 August 2026"
      intro={`The rules that apply when you book with ${BRAND} — how a booking is confirmed, what a fare covers, and what happens when plans change.`}
      sections={[
        {
          heading: "About these terms",
          body: (
            <>
              <p>
                These terms apply to every booking made with {BRAND} through
                this website or over WhatsApp, across{" "}
                {BUSINESS.areasServed.join(", ")}.
              </p>
              <p>
                By submitting a booking request you accept them. If something
                here does not work for your trip, tell us before you book —
                most of it can be agreed differently in writing.
              </p>
            </>
          ),
        },
        {
          heading: "Booking and confirmation",
          body: (
            <>
              <p>
                Submitting the form sends a <strong>booking request</strong>,
                not a confirmed booking. Nothing is reserved until a person has
                checked availability and confirmed it with you on WhatsApp.
              </p>
              <LegalList
                items={[
                  "You receive a reference code immediately. It identifies the request, and lets you track it.",
                  "We contact you to confirm the vehicle, the timing and the final fare.",
                  <>Your booking is confirmed only once we say so. Until then, treat it as pending.</>,
                  "If we cannot cover your trip properly, we will tell you rather than accept it and hope.",
                ]}
              />
            </>
          ),
        },
        {
          heading: "Fares and payment",
          body: (
            <>
              <p>
                The figure shown when you book is an <strong>estimate</strong>,
                calculated from your route and vehicle class. The fare becomes
                fixed when we confirm it with you.
              </p>
              <LegalList
                items={[
                  "A confirmed fare does not change because of traffic, a longer route, or demand. There is no surge pricing.",
                  "It does change if you change the trip — a new destination, extra stops, or additional hours are re-quoted and agreed with you.",
                  "Tolls, parking and airport gate fees are included unless we tell you otherwise when confirming.",
                  "We accept cash, card and bank transfer. Payment is due on completion of the trip unless agreed otherwise in advance.",
                ]}
              />
              <p>
                Corporate accounts can be invoiced monthly — ask us to set one
                up.
              </p>
            </>
          ),
        },
        {
          heading: "Changes and cancellations",
          body: (
            <>
              <p>
                Message us on WhatsApp with your reference code. Because a
                person handles every booking, a change is a conversation rather
                than a form.
              </p>
              <LegalList
                items={[
                  <>
                    <strong>More than {FREE_CANCEL_HOURS} hours before pickup</strong> — cancel
                    or change free of charge.
                  </>,
                  <>
                    <strong>Within {FREE_CANCEL_HOURS} hours, before a driver is assigned</strong> —
                    free of charge, though we ask you to tell us as early as you can.
                  </>,
                  <>
                    <strong>After a driver has been assigned</strong> — {LATE_CANCEL_PERCENT}% of
                    the agreed fare, because the driver has already been committed to your trip
                    and turned other work down.
                  </>,
                  <>
                    <strong>No-show</strong> — if nobody is at the pickup point and we cannot
                    reach you after the free waiting time, the full fare applies.
                  </>,
                ]}
              />
              <p>
                Moving a booking to a different time is not a cancellation. If
                we can accommodate the new time, there is no charge.
              </p>
            </>
          ),
        },
        {
          heading: "Waiting time",
          body: (
            <>
              <p>Free waiting is included in every booking:</p>
              <LegalList
                items={[
                  <>
                    <strong>{WAIT_AIRPORT_MIN} minutes</strong> at airports, measured from the
                    time your flight actually lands — not from the time you booked. If your
                    flight is delayed, the clock moves with it.
                  </>,
                  <>
                    <strong>{WAIT_STANDARD_MIN} minutes</strong> at all other pickup points,
                    from the agreed pickup time.
                  </>,
                ]}
              />
              <p>
                Beyond that, waiting is charged in 15-minute blocks at the rate
                we confirm with you when you book. We will always message you
                before waiting time starts being charged — you will not find out
                from an invoice.
              </p>
            </>
          ),
        },
        {
          heading: "Hourly bookings and city tours",
          body: (
            <>
              <LegalList
                items={[
                  <>Hourly hire starts at <strong>{HOURLY_MINIMUM} hours</strong>.</>,
                  "The car and driver stay with you for the hours booked. Stops, detours and waiting are included — that is what you are paying for.",
                  "You set the route. The driver may decline a destination that is unsafe, unlawful, or outside the areas we cover.",
                  "If the day runs longer than booked, message us and we will extend it where the vehicle is free. Extra hours are charged at the same hourly rate.",
                  "Fuel is included. Entry tickets, parking at attractions and the driver's meals during long days are not.",
                ]}
              />
            </>
          ),
        },
        {
          heading: "Airport transfers",
          body: (
            <>
              <LegalList
                items={[
                  "Give us your flight number when booking. We track the arrival and move your pickup to match a delayed landing.",
                  <>Free waiting at airports is {WAIT_AIRPORT_MIN} minutes from actual landing time.</>,
                  "We agree the exact meeting point with you in advance, since it differs by terminal.",
                  "If your flight is cancelled, tell us as soon as you can and we will cancel without charge.",
                  "If you land and cannot find your driver, call us before booking another car — we will resolve it on the phone.",
                ]}
              />
            </>
          ),
        },
        {
          heading: "Car rental",
          body: (
            <>
              <p>
                Self-drive rental has additional requirements we confirm with
                you before delivery — driving licence, minimum age, security
                deposit and insurance excess all depend on the vehicle and on
                whether you are a UAE resident.
              </p>
              <p>
                Nothing is charged until those are agreed. You will never be
                turned away at handover for a requirement we did not tell you
                about.
              </p>
            </>
          ),
        },
        {
          heading: "Your responsibilities",
          body: (
            <>
              <LegalList
                items={[
                  "Give accurate pickup details and a contactable number. Most problems are a wrong address or an unanswered phone.",
                  "Be at the pickup point at the agreed time.",
                  "Wear seat belts, and make sure children travelling with you are seated as UAE law requires.",
                  "No smoking in the vehicles. No illegal substances.",
                  "You are responsible for damage to the vehicle caused deliberately or by unreasonable behaviour, including cleaning costs where a vehicle is left unfit for the next passenger.",
                  "Treat drivers with respect. We will end a trip that becomes unsafe or abusive, and no refund is due in that case.",
                ]}
              />
            </>
          ),
        },
        {
          heading: "Our responsibilities and limits",
          body: (
            <>
              <p>
                We will get you where you are going in a licensed vehicle with a
                licensed driver, at the fare we agreed. Where we fall short, we
                will put it right.
              </p>
              <LegalList
                items={[
                  "We are not liable for delays caused by traffic, weather, road closures, accidents or other things outside our control. We will keep you informed when they happen.",
                  "We are not liable for missed flights, missed appointments or consequential losses. Book with time to spare for anything critical.",
                  <>
                    Where we are liable, our liability is limited to the value of the booking —
                    except where UAE law does not allow that limit, such as death or personal
                    injury caused by our negligence.
                  </>,
                  "Check for belongings before you leave. We will try to recover items left in a vehicle but cannot guarantee it.",
                ]}
              />
            </>
          ),
        },
        {
          heading: "If we cancel",
          body: (
            <>
              <p>
                Occasionally we have to cancel — a vehicle breakdown, a driver
                unable to work, or conditions that make a trip unsafe.
              </p>
              <LegalList
                items={[
                  "We will tell you as soon as we know, not at the pickup time.",
                  "We will offer a replacement vehicle where we can.",
                  "If we cannot, nothing is charged. Anything paid in advance is refunded in full.",
                ]}
              />
            </>
          ),
        },
        {
          heading: "Complaints",
          body: (
            <p>
              If something went wrong, message us on WhatsApp at{" "}
              {formatPhone(BUSINESS.whatsapp)} with your reference code. A
              person will read it and reply — we do not run a ticket queue. We
              aim to resolve complaints within 7 days.
            </p>
          ),
        },
        {
          heading: "Governing law",
          body: (
            <p>
              These terms are governed by the laws of the United Arab Emirates,
              and any dispute is subject to the jurisdiction of the UAE courts.
            </p>
          ),
        },
        {
          heading: "Changes to these terms",
          body: (
            <p>
              We may update these terms. The version that applies to your
              booking is the one published when we confirmed it, and we will not
              change the rules on a booking already accepted. The date at the
              top shows when this page last changed.
            </p>
          ),
        },
        {
          heading: "Contact us",
          body: (
            <>
              <p>
                WhatsApp {formatPhone(BUSINESS.whatsapp)} or email{" "}
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="text-ink-muted hover:text-accent-strong"
                >
                  {BUSINESS.email}
                </a>
                .
              </p>
              <p>
                See also our{" "}
                <Link href="/privacy" className="text-ink-muted hover:text-accent-strong">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/faqs" className="text-ink-muted hover:text-accent-strong">
                  FAQs
                </Link>
                .
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
