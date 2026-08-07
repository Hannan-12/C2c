import { ServicePage, type ServicePageContent } from "@/components/service-page";
import { ServicePhoto } from "@/components/service-photo";
import { getPricedRoutes } from "@/lib/routes-catalogue";
import { formatFare } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

/** Pricing changes rarely; an hour-old board matches the homepage. */
export const revalidate = 3600;

export const metadata = pageMetadata({
  title: "Chauffeur Rides",
  description:
    "Point-to-point chauffeur rides across Dubai, Abu Dhabi and Sharjah. Fixed fare quoted before you book, confirmed by a person over WhatsApp.",
  path: "/rides",
});

// TODO(client): fleet detail and any route-specific pricing to replace the
// starting fares below, which come from the seeded vehicle_pricing table.
const content: ServicePageContent = {
  eyebrow: "Point to point · Dubai, Abu Dhabi, Sharjah",
  title: (
    <>
      One route.
      <br />
      One fare, agreed
      <br />
      <span className="text-accent-strong">before you go.</span>
    </>
  ),
  intro:
    "Tell us where you're starting and where you're headed. You get a fare for that exact route before anything is booked, and it doesn't move because traffic did.",
  included: [
    {
      title: "The fare is the fare",
      copy: "Quoted on distance and vehicle class up front. No meter, no surge multiplier at the end of the trip.",
    },
    {
      title: "A person confirms it",
      copy: "Someone checks the car and driver are actually available, then messages you on WhatsApp to agree the details.",
    },
    {
      title: "Driver details in advance",
      copy: "You get the driver's name and number before pickup, not a moving dot on a map two minutes out.",
    },
    {
      title: "Any hour",
      copy: "Bookings are taken around the clock, including early-morning departures and late arrivals.",
    },
    {
      title: "Pay how you like",
      copy: "Cash, card or bank transfer — settled with the driver or in advance, whichever suits you.",
    },
    {
      title: "Track with a code",
      copy: "Every booking gets a reference code that shows current status and driver details once assigned.",
    },
  ],
  faqs: [
    {
      question: "How far in advance should I book?",
      answer:
        "Same-day bookings are usually fine, but the more notice you give the more choice you have of vehicle class. For early-morning airport runs, the night before is safer.",
    },
    {
      question: "Can I book a ride for someone else?",
      answer:
        "Yes. Put your own WhatsApp number on the booking so we confirm with you, and tell us the passenger's name when we message. The driver's details go to whoever you ask us to send them to.",
    },
    {
      question: "What happens if my plans change?",
      answer:
        "Message us on WhatsApp using your reference code. Because a person handles every booking, changes are a conversation rather than a form.",
    },
  ],
  art: <ServicePhoto src="/images/rides.jpg" alt="Dubai skyline at dusk, seen across the city" priority />,
  bookHref: "/book?serviceType=ride",
};

export default async function RidesPage() {
  // Same source as the homepage route board, so a fare can never be quoted
  // differently on two pages of the same site.
  const routes = await getPricedRoutes();

  return (
    <ServicePage
      content={{
        ...content,
        table: {
          heading: "Routes people ask for",
          note: "Starting fares for the Comfort class. Your own route is priced live before you submit.",
          caption: "Popular routes with distance, drive time and starting fare",
          columns: ["Route", "Distance", "Drive", "From"],
          rows: routes.map((route) => [
            `${route.from} → ${route.to}`,
            `${route.distanceKm} km`,
            `${route.durationMin} min`,
            formatFare(route.fromFare, route.currency),
          ]),
        },
      }}
    />
  );
}
