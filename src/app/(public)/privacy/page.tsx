import Link from "next/link";
import { LegalList, LegalPage } from "@/components/legal-page";
import { BRAND, BUSINESS, pageMetadata } from "@/lib/seo";
import { formatPhone } from "@/lib/format";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "What Ride On Click collects, why, who it is shared with, how long it is kept, and how to have it deleted.",
  path: "/privacy",
});

/**
 * Written from what the application actually does, not from a template.
 *
 * Every claim here is checkable against the code: the fields listed are the
 * columns in `bookings`, the third parties are the only outbound calls we
 * make (Resend, Google Routes), and the statement that we set no tracking
 * cookies is true because the public site sets none at all.
 *
 * TODO(client): two things here are business decisions, not technical facts,
 * and should be confirmed before launch —
 *   1. the retention period (currently stated as 24 months)
 *   2. the legal entity name, once registered, for the "Who we are" section
 *
 * This is a factual first draft. It is not legal advice and should be
 * reviewed by a lawyer familiar with UAE Federal Decree-Law No. 45 of 2021.
 */

const RETENTION_MONTHS = 24;

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="8 August 2026"
      intro={`How ${BRAND} handles your personal information — what we collect, why, who sees it, and how to have it removed.`}
      sections={[
        {
          heading: "Who we are",
          body: (
            <>
              <p>
                {BRAND} is a chauffeur and car hire service operating in{" "}
                {BUSINESS.areasServed.join(", ")}. We are the controller of the
                personal data described in this policy — meaning we decide what
                is collected and why.
              </p>
              <p>
                We handle personal data in line with UAE Federal Decree-Law No.
                45 of 2021 on the Protection of Personal Data.
              </p>
            </>
          ),
        },
        {
          heading: "What we collect",
          body: (
            <>
              <p>Only what a booking needs. When you book, we collect:</p>
              <LegalList
                items={[
                  <><strong>Your name</strong> — so the driver knows who they are meeting.</>,
                  <><strong>Your WhatsApp number</strong> — the channel we confirm on.</>,
                  <><strong>Your email address</strong>, if you give one — optional, used only to send booking emails.</>,
                  <><strong>Pickup and drop-off locations</strong>, and any stops, including coordinates where your browser or our address lookup provides them.</>,
                  <><strong>Date and time</strong> of travel, and the duration for hourly bookings.</>,
                  <><strong>Flight number</strong>, for airport transfers, so we can track delays.</>,
                  <><strong>Passenger and luggage counts</strong>, and the vehicle class you choose.</>,
                ]}
              />
              <p>
                We do not ask for, and do not store, payment card details. Fares
                are settled directly with us or the driver.
              </p>
              <p>
                We do not track your location. The only locations we hold are the
                addresses you type into the booking form.
              </p>
            </>
          ),
        },
        {
          heading: "Why we collect it",
          body: (
            <>
              <p>Each item above exists for one of three reasons:</p>
              <LegalList
                items={[
                  <><strong>To quote a fare</strong> — your route is sent to a mapping service to calculate distance and drive time.</>,
                  <><strong>To arrange your ride</strong> — confirming details with you, assigning a driver, and giving that driver what they need to find you.</>,
                  <><strong>To keep a record</strong> of bookings we have accepted, so we can answer questions about a past trip.</>,
                ]}
              />
              <p>
                We do not use your details for advertising, and we do not build
                a profile of you.
              </p>
            </>
          ),
        },
        {
          heading: "Who else sees it",
          body: (
            <>
              <p>Your information is shared only where a booking requires it:</p>
              <LegalList
                items={[
                  <><strong>The driver assigned to your trip</strong> — your name, contact number and route.</>,
                  <><strong>Google</strong> — pickup and drop-off addresses are sent to the Google Routes API to calculate distance and duration. No name or contact detail is sent.</>,
                  <><strong>Resend</strong> — our email provider. If you give an email address, it and your booking summary pass through them to deliver your confirmation.</>,
                  <><strong>Our hosting provider</strong> — which stores the database the booking is saved in.</>,
                ]}
              />
              <p>
                We do not sell your data, and we do not share it with
                advertisers or data brokers. We will disclose information if
                required to by law or by a competent UAE authority.
              </p>
            </>
          ),
        },
        {
          heading: "Your reference code",
          body: (
            <>
              <p>
                Every booking gets a reference code, and anyone who has that code
                can view the booking&apos;s status, route and assigned driver on
                our tracking page without signing in.
              </p>
              <p>
                This is deliberate — it means you can check a booking without an
                account, and forward it to whoever is travelling. It also means{" "}
                <strong>you should treat the code as private</strong>. Codes are
                long and randomly generated so they cannot be guessed, and
                tracking pages are excluded from search engines.
              </p>
            </>
          ),
        },
        {
          heading: "Cookies and analytics",
          body: (
            <>
              <p>
                This website sets <strong>no advertising or analytics cookies</strong>,
                and carries no third-party tracking scripts.
              </p>
              <p>
                The only cookie we set is a sign-in session for our own staff
                using the admin dashboard. It is never set for customers
                browsing or booking.
              </p>
              <p>
                Our servers briefly hold the IP address of requests to limit
                automated abuse of the booking form. These are held in memory
                only, are not written to our database, and are not linked to
                your booking.
              </p>
            </>
          ),
        },
        {
          heading: "How long we keep it",
          body: (
            <>
              <p>
                Booking records are kept for {RETENTION_MONTHS} months after the
                trip date, so we can resolve questions, disputes or invoicing
                that arise afterwards. After that they are deleted.
              </p>
              <p>
                You can ask us to delete your records sooner — see{" "}
                <a href="#your-rights" className="text-ink-muted hover:text-accent-strong">
                  Your rights
                </a>{" "}
                below.
              </p>
            </>
          ),
        },
        {
          heading: "How we protect it",
          body: (
            <>
              <LegalList
                items={[
                  "Traffic between your browser and our site is encrypted in transit.",
                  "The admin dashboard requires a password, and staff passwords are stored hashed, never in readable form.",
                  "Access to booking records is limited to staff who need it to arrange rides.",
                  "Reference codes are generated from a cryptographic random source so booking records cannot be found by guessing.",
                ]}
              />
              <p>
                No system is perfectly secure, and we will not claim otherwise.
                If a breach affects your data, we will tell you and notify the
                relevant authority as the law requires.
              </p>
            </>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <>
              <p>You can ask us at any time to:</p>
              <LegalList
                items={[
                  "Tell you what personal data we hold about you.",
                  "Correct anything that is wrong.",
                  "Delete your records, where we are not required to keep them.",
                  "Stop using your data for a given purpose, or withdraw consent you previously gave.",
                  "Provide a copy of your data in a portable form.",
                ]}
              />
              <p>
                Message us on WhatsApp at {formatPhone(BUSINESS.whatsapp)} or
                email{" "}
                <a href={`mailto:${BUSINESS.email}`} className="text-ink-muted hover:text-accent-strong">
                  {BUSINESS.email}
                </a>
                . We will respond within 30 days. There is no charge for this.
              </p>
            </>
          ),
        },
        {
          heading: "Children",
          body: (
            <p>
              Our service is not directed at children, and we do not knowingly
              collect data from anyone under 18. Children travel as passengers
              on bookings made by an adult; we hold no separate record of them
              beyond the passenger count.
            </p>
          ),
        },
        {
          heading: "Changes to this policy",
          body: (
            <p>
              If we change how we handle personal data, we will update this page
              and change the date at the top. Material changes affecting
              existing bookings will be sent to you directly.
            </p>
          ),
        },
        {
          heading: "Contact us",
          body: (
            <>
              <p>
                For anything in this policy — including requests about your data
                — reach us on WhatsApp at {formatPhone(BUSINESS.whatsapp)} or by
                email at{" "}
                <a href={`mailto:${BUSINESS.email}`} className="text-ink-muted hover:text-accent-strong">
                  {BUSINESS.email}
                </a>
                .
              </p>
              <p>
                See also our{" "}
                <Link href="/terms" className="text-ink-muted hover:text-accent-strong">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link href="/contact-us" className="text-ink-muted hover:text-accent-strong">
                  contact details
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
