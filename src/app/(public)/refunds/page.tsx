import Link from "next/link";
import { LegalList, LegalPage } from "@/components/legal-page";
import { BRAND, BUSINESS, pageMetadata } from "@/lib/seo";
import {
  FREE_CANCEL_HOURS,
  LATE_CANCEL_PERCENT,
  REFUND_BANK_DAYS_LABEL,
  REFUND_REVIEW_DAYS_LABEL,
} from "@/lib/service-terms";
import { formatPhone } from "@/lib/format";

export const metadata = pageMetadata({
  title: "Refunds & Disputes",
  description:
    "How Ride On Click issues refunds on card and cash bookings, what a cancellation costs, and how to raise a problem with a charge before it becomes a chargeback.",
  path: "/refunds",
});

/**
 * Refund and dispute policy, separate from the terms.
 *
 * The cancellation rules already live in /terms, but they answer "what does
 * it cost to cancel" and not "I paid by card and want my money back" — the
 * question that turns into a chargeback when a site does not answer it. A
 * customer who can read the timeline and the route to a human does not go to
 * their bank first, which is the whole point of publishing this.
 *
 * The cancellation figures are imported rather than retyped, so this page and
 * the terms cannot drift apart. See lib/service-terms.ts.
 *
 * Not legal advice. Should be reviewed by a lawyer before launch, alongside
 * the terms and the privacy policy.
 */
export default function RefundsPage() {
  const contact = (
    <>
      WhatsApp {formatPhone(BUSINESS.whatsapp)} or email{" "}
      <a
        href={`mailto:${BUSINESS.email}`}
        className="text-ink-muted hover:text-accent-strong"
      >
        {BUSINESS.email}
      </a>
    </>
  );

  return (
    <LegalPage
      title="Refunds & Disputes"
      updated="22 August 2026"
      intro={`When ${BRAND} refunds a payment, how long it takes, and what to do if a charge looks wrong. Read alongside our terms, which set the cancellation rules these refunds follow.`}
      sections={[
        {
          heading: "Who you are paying",
          body: (
            <>
              <p>
                {BRAND} is the trading name of{" "}
                <strong>{BUSINESS.legalEntity}</strong>. That is the name that
                may appear on your card statement, so a charge you do not
                recognise under that name is very likely one of ours — please{" "}
                {contact} before disputing it with your bank.
              </p>
            </>
          ),
        },
        {
          heading: "When you are charged",
          body: (
            <>
              <p>
                Submitting the booking form charges you nothing. It sends a
                request, and a person checks availability and agrees the fare
                with you first.
              </p>
              <LegalList
                items={[
                  "Card — once your booking is confirmed we send a secure payment link. The amount on that link is the fare we agreed with you, and nothing is taken until you complete it.",
                  "Cash — paid to the driver at the end of the trip. Nothing is taken in advance, so there is nothing to refund if the trip does not happen.",
                  "Bank transfer — arranged with you directly, usually for corporate accounts.",
                ]}
              />
              <p>
                Card payments are handled by Stripe. We never see or store your
                full card number.
              </p>
            </>
          ),
        },
        {
          heading: "Cancelling: what comes back",
          body: (
            <>
              <p>
                The charge depends on how much notice we have. The rules are in
                our{" "}
                <Link href="/terms#changes-and-cancellations" className="text-ink-muted hover:text-accent-strong">
                  terms
                </Link>
                ; this is what happens to money you have already paid.
              </p>
              <LegalList
                items={[
                  <>
                    <strong>More than {FREE_CANCEL_HOURS} hours before pickup</strong> —
                    no charge. Anything paid is refunded in full.
                  </>,
                  <>
                    <strong>Less than {FREE_CANCEL_HOURS} hours before pickup</strong> —{" "}
                    {LATE_CANCEL_PERCENT}% of the fare is due. If you have paid
                    in full, the remaining {100 - LATE_CANCEL_PERCENT}% is
                    refunded. If you have paid nothing, we invoice the{" "}
                    {LATE_CANCEL_PERCENT}%.
                  </>,
                  <>
                    <strong>No-show</strong> — the full fare is due and no refund is
                    issued. If you were delayed rather than absent, tell us:
                    waiting time is allowed for, and a driver who waited is a
                    different situation from one who was never needed.
                  </>,
                  <>
                    <strong>We cancel</strong> — a breakdown, an unavailable driver, or
                    conditions that make the trip unsafe. Nothing is charged and
                    anything paid is refunded in full, whatever the notice.
                  </>,
                ]}
              />
            </>
          ),
        },
        {
          heading: "If the trip went wrong",
          body: (
            <>
              <p>
                A refund is not limited to cancellations. Tell us what happened
                and we will put it right — in most cases without argument,
                because a trip that did not work is not one we want paying for.
              </p>
              <LegalList
                items={[
                  "The driver did not arrive, or arrived so late the trip was pointless — refunded in full.",
                  "A different class of vehicle turned up than the one you booked — refunded the difference, or in full if the vehicle could not carry your party.",
                  "You were charged more than the fare we confirmed — the difference is refunded. A confirmed fare does not change for traffic, route or demand.",
                  "Something else went wrong — tell us and we will assess it. Partial refunds are normal where part of the service was delivered.",
                ]}
              />
              <p>
                Two exceptions, both in our terms: a trip we end because it
                became unsafe or abusive, and charges you agreed during the trip
                such as extra stops or additional hours.
              </p>
            </>
          ),
        },
        {
          heading: "How to ask for a refund",
          body: (
            <>
              <p>
                There is no form. {contact} with your reference code and what
                went wrong. A person reads it — we do not run a ticket queue.
              </p>
              <LegalList
                items={[
                  "Ask within 14 days of the trip where you can. We will still look at older requests, but details get harder to check.",
                  <>
                    We reply within 2 business days. Refunds are
                    <strong>not automatic</strong> — a person reads the request
                    and decides it against this policy, which normally takes
                    {REFUND_REVIEW_DAYS_LABEL} business days from the point we
                    agree it.
                  </>,
                  "If we disagree, we will tell you why in writing rather than stop replying.",
                ]}
              />
            </>
          ),
        },
        {
          heading: "How a refund reaches you",
          body: (
            <>
              <LegalList
                items={[
                  <>
                    <strong>Card</strong> — refunded to the same card through
                    Stripe. We send it within {REFUND_REVIEW_DAYS_LABEL}{" "}
                    business days of agreeing it; your bank then takes a further{" "}
                    {REFUND_BANK_DAYS_LABEL} business days to show it. We cannot
                    refund to a different card or in cash.
                  </>,
                  <>
                    <strong>Bank transfer</strong> — returned to the account it
                    came from, within {REFUND_REVIEW_DAYS_LABEL} business days of
                    agreeing it.
                  </>,
                  "Cash — there is nothing to return, because cash is paid after the trip. Where a cash trip went wrong we agree a credit against a future booking, or a transfer to your account.",
                ]}
              />
              <p>
                Your tracking page shows the refund — the amount and the date we
                sent it — as soon as it leaves us, so you can tell the difference
                between a refund still with your bank and one we have not sent
                yet. Nothing on that page changes by itself: a figure appears
                there only because a person issued the refund.
              </p>
              <p>
                Refunds are made in AED, the currency you were charged in. If
                your card is billed in another currency, your bank&apos;s
                exchange rate on the refund date may differ slightly from the
                rate on the original charge — that difference is your
                bank&apos;s, not a deduction by us.
              </p>
            </>
          ),
        },
        {
          heading: "Disputes and chargebacks",
          body: (
            <>
              <p>
                If you think a charge is wrong, {contact} first. We can usually
                resolve it in a day, and a refund we issue directly reaches you
                faster than one that goes through your bank.
              </p>
              <p>
                If you raise a chargeback with your bank instead, we will
                respond with the booking record — the confirmed fare, the
                messages agreeing it, and the trip itself. Where the claim is
                right we will not contest it. We may decline future bookings
                from an account that charges back a trip we delivered and
                agreed.
              </p>
              <p>
                This policy does not affect your rights under UAE consumer
                protection law.
              </p>
            </>
          ),
        },
        {
          heading: "Contact us",
          body: (
            <p>
              {contact}. We answer {BUSINESS.openingHoursLabel}, and refunds are
              handled by the same people who handle the bookings.
            </p>
          ),
        },
      ]}
    />
  );
}
