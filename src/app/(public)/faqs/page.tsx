import Link from "next/link";
import { FaqList } from "@/components/service-page";
import { BUSINESS, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "FAQs",
  description:
    "How booking works, payment, cancellations, airport pickups, vehicles and drivers. Answers to the questions we're asked most.",
  path: "/faqs",
});

/**
 * TODO(client): the best source for this page is your actual WhatsApp history
 * — the questions customers really ask, in their words. Several answers below
 * are deliberately non-committal where a policy has not been set yet
 * (cancellation fees, waiting-time allowance, child seats). Replace those with
 * the real policy before launch; they are marked in the data.
 */
const GROUPS: { heading: string; items: { question: string; answer: string }[] }[] = [
  {
    heading: "Booking",
    items: [
      {
        question: "How do I book a ride?",
        answer:
          "Fill in the booking form with your route, date and vehicle class. You'll get an instant fare estimate and a reference code, then someone messages you on WhatsApp to confirm the details and the final fare.",
      },
      {
        question: "Is my booking confirmed straight away?",
        answer:
          "Not immediately. Submitting the form sends a request, and a person checks availability before confirming. That's deliberate — it means a human has verified the car and driver rather than an algorithm assuming they exist.",
      },
      {
        question: "How far in advance can I book?",
        answer:
          "As far ahead as you like, and same-day bookings are usually fine too. For early-morning airport runs, booking the night before is safer.",
      },
      {
        question: "Can I book on behalf of someone else?",
        answer:
          "Yes. Use your own WhatsApp number so we confirm with you, and tell us the passenger's name when we message.",
      },
      {
        question: "Which areas do you cover?",
        answer: `We operate across ${BUSINESS.areasServed.join(", ")}, including trips between them.`,
      },
      {
        question: "Are you available at night?",
        answer:
          "Yes. Bookings are taken and confirmed around the clock, every day of the week.",
      },
    ],
  },
  {
    heading: "Fares and payment",
    items: [
      {
        question: "How is the fare calculated?",
        answer:
          "Point-to-point rides are priced on the distance of your route and the vehicle class. Hourly bookings are priced on the hours you book rather than distance travelled.",
      },
      {
        question: "Is the estimate the final price?",
        answer:
          "The figure shown when you book is an estimate. We confirm the final fare with you on WhatsApp before the ride is assigned, so you agree it before anything is committed.",
      },
      {
        question: "How can I pay?",
        answer:
          "Cash, card and bank transfer are all accepted. We agree the method with you when the booking is confirmed.",
      },
      {
        question: "Do prices change with demand?",
        answer:
          "No. There's no surge multiplier — the fare you agree is the fare you pay.",
      },
    ],
  },
  {
    heading: "Changes and cancellations",
    items: [
      {
        question: "Can I cancel or change my booking?",
        answer:
          "Cancel free of charge more than 12 hours before pickup, or any time before a driver is assigned. Once a driver is assigned, 50% of the fare applies, because they have turned other work down. Moving a booking to a different time is free if we can accommodate it. Full terms are on our Terms & Conditions page.",
      },
      {
        question: "What if my flight is delayed?",
        answer:
          "If you gave us your flight number, we track the arrival and move your pickup to match. You don't need to message us, though you're welcome to. Airport bookings include 60 minutes of free waiting, measured from when your flight actually lands rather than from the time you booked.",
      },
      {
        question: "What happens if the driver doesn't arrive?",
        answer:
          "Message us on WhatsApp immediately with your reference code. Your booking is tied to a named driver and a real person on our side, so it's resolved directly rather than through a support queue.",
      },
    ],
  },
  {
    heading: "Vehicles and drivers",
    items: [
      {
        question: "What vehicles do you have?",
        answer:
          "Comfort, Business, SUV, VIP and Van classes. You pick the class when booking, and each one shows how many passengers and bags it takes.",
      },
      {
        question: "Will I know who my driver is?",
        answer:
          "Yes. Once a driver is assigned, their name and number appear on your tracking page, and we send them to you on WhatsApp.",
      },
      {
        // TODO(client): confirm child seat availability and any charge.
        question: "Can you provide a child seat?",
        answer:
          "Ask when we confirm your booking on WhatsApp and we'll tell you what's available for the vehicle class you've chosen.",
      },
      {
        question: "Can you take a large group?",
        answer:
          "Yes — the Van class seats seven with room for six bags. For larger groups, message us and we'll arrange more than one vehicle.",
      },
    ],
  },
  {
    heading: "Tracking and privacy",
    items: [
      {
        question: "How do I track my booking?",
        answer:
          "Every booking gets a reference code. Enter it on the tracking page to see the current status and, once assigned, your driver's details.",
      },
      {
        question: "Who can see my booking details?",
        answer:
          "Anyone with your reference code can view that booking's status, so treat the code as private. Codes are long and randomly generated specifically so they can't be guessed.",
      },
      {
        question: "What do you do with my information?",
        answer:
          "We use your name, contact details and route to arrange and confirm your ride. We don't sell your data.",
      },
    ],
  },
];

const ALL = GROUPS.flatMap((group) => group.items);

export default function FaqsPage() {
  /**
   * FAQPage structured data — the only page eligible for FAQ rich results.
   * Generated from the same array the page renders, so the markup can never
   * describe answers that differ from what a visitor actually sees, which is
   * the thing Google penalises.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ALL.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div className="relative overflow-x-clip px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
          Help centre
        </p>
        <h1
          className="animate-rise display text-[2.5rem] sm:text-5xl leading-[0.98] mb-6"
          style={{ animationDelay: "120ms" }}
        >
          Questions,
          <br />
          <span className="text-accent-strong">answered.</span>
        </h1>
        <p
          className="animate-rise text-ink-muted text-lg leading-relaxed"
          style={{ animationDelay: "220ms" }}
        >
          If your question isn&apos;t here, message us on WhatsApp — a person
          reads it, {BUSINESS.openingHoursLabel}.
        </p>
      </section>

      {GROUPS.map((group) => (
        <section
          key={group.heading}
          className="reveal mt-16"
          aria-labelledby={`faq-${group.heading.replace(/\s+/g, "-").toLowerCase()}`}
        >
          <h2
            id={`faq-${group.heading.replace(/\s+/g, "-").toLowerCase()}`}
            className="display text-2xl sm:text-3xl mb-6"
          >
            {group.heading}
          </h2>
          <FaqList items={group.items} />
        </section>
      ))}

      <section className="reveal mt-20 mb-6">
        <div className="rounded-card bg-dock text-ink-inverse p-8 sm:p-10">
          <h2 className="display text-2xl sm:text-3xl mb-2">Still stuck?</h2>
          <p className="text-ink-inverse/70 mb-7 max-w-lg leading-relaxed">
            Message us with your reference code and we&apos;ll pick it up from
            there.
          </p>
          <Link href="/book" className="btn-primary">
            Book a ride
          </Link>
        </div>
      </section>
    </div>
  );
}
