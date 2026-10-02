import { ServicePage, type ServicePageContent } from "@/components/service-page";
import { ServicePhoto } from "@/components/service-photo";
import { pageMetadata } from "@/lib/seo";
import { ROUTE_FEES_CONFIRMATION } from "@/lib/service-terms";

export const metadata = pageMetadata({
  title: "Airport Transfers",
  description:
    "Airport transfers to and from DXB, DWC, AUH and Sharjah. Request a fare before booking and confirm your pickup arrangements with the team.",
  path: "/airport-rides",
});

// TODO(client): confirm terminal pickup arrangements and waiting terms before
// publishing specific meeting-point or waiting claims.
const content: ServicePageContent = {
  eyebrow: "DXB · DWC · AUH · SHJ",
  title: (
    <>
      Airport rides.
      <br />
      <span className="text-accent-strong">Pickup details confirmed with you.</span>
    </>
  ),
  intro:
    "Request an airport pickup and confirm the arrangements with the team before booking. Contact us if your plans change.",
  art: (
    <ServicePhoto
      src="/images/airport.jpg"
      alt="Departures hall of an airport terminal"
      priority
    />
  ),
  codes: [
    { code: "DXB", label: "Dubai International" },
    { code: "DWC", label: "Al Maktoum" },
    { code: "AUH", label: "Abu Dhabi" },
    { code: "SHJ", label: "Sharjah" },
  ],
  // A transfer genuinely happens in this order, which is why it is numbered.
  sequence: [
    { label: "You book the flight number", copy: "It sits on the booking, not in a note someone has to read." },
    { label: "Confirm the pickup", copy: "Discuss the pickup arrangements with the team before booking." },
    { label: "Driver is named", copy: "Their name and number reach you before you land." },
    { label: "Fare already agreed", copy: "Settled at booking, so nothing is negotiated at the kerb." },
  ],
  table: {
    heading: "Airports we cover",
    note: "Ask the team to confirm pickup and travel details for your airport and address.",
    caption: "Airports listed with their airport codes",
    columns: ["Airport", "Code"],
    rows: [
      ["Dubai International", "DXB"],
      ["Al Maktoum", "DWC"],
      ["Abu Dhabi", "AUH"],
      ["Sharjah", "SHJ"],
    ],
  },
  included: [
    {
      title: "Pickup coordination",
      copy: "Confirm the pickup arrangements with the team. Contact us if your plans change.",
    },
    {
      title: "Fare fixed before you fly",
      copy: "Agreed at booking, so the price is settled while you're still at home rather than negotiated at the kerb.",
    },
    {
      title: "Luggage counted in",
      copy: "You tell us how many bags when booking, and we send a car that fits them. No arriving to a boot that's too small.",
    },
    {
      title: "Pickup timing",
      copy: "Enter your preferred pickup time in the booking request. Availability is confirmed with you.",
    },
    {
      title: "Driver details before landing",
      copy: "Name and number are on your tracking page once assigned, so you know who you're looking for.",
    },
    {
      title: "All four airports",
      copy: "Airport rides for Dubai International, Al Maktoum, Abu Dhabi and Sharjah. Confirm the requested direction with the team.",
    },
    {
      title: "Tolls and other fees",
      copy: ROUTE_FEES_CONFIRMATION,
    },
  ],
  faqs: [
    {
      question: "What if my flight is delayed?",
      answer:
        "If your flight timing changes, contact us with your reference code to discuss the pickup arrangements. Ask the team to confirm any waiting terms for your booking.",
    },
    {
      question: "Where does the driver meet me?",
      answer:
        "Ask the team to confirm the pickup point for your airport and terminal before booking.",
    },
    {
      question: "Do you cover Abu Dhabi and Sharjah airports?",
      answer:
        "Airport rides can be requested for Dubai International (DXB), Al Maktoum (DWC), Abu Dhabi (AUH) and Sharjah (SHJ). Confirm the requested direction and pickup point with the team.",
    },
    {
      question: "Can I book a return transfer at the same time?",
      answer:
        "Book each leg separately so each one gets its own reference code and driver, then mention on WhatsApp that they belong together and we'll keep them consistent.",
    },
    {
      question: "How are tolls and other route fees handled?",
      answer: ROUTE_FEES_CONFIRMATION,
    },
  ],
  schema: {
    name: "Airport Transfers",
    description: "Airport pickups and drop-offs with arrangements confirmed directly with the team.",
    path: "/airport-rides",
  },
  bookHref: "/book?serviceType=airport",
  routeLinks: [
    { label: "Dubai Airport to Dubai Marina", href: "/transfers/dubai-airport-to-dubai-marina" },
    { label: "Dubai Airport to Downtown Dubai", href: "/transfers/dubai-airport-to-downtown-dubai" },
    { label: "Dubai Airport to Palm Jumeirah", href: "/transfers/dubai-airport-to-palm-jumeirah" },
    { label: "Dubai Airport to Abu Dhabi", href: "/transfers/dubai-airport-to-abu-dhabi" },
    { label: "Abu Dhabi Airport to Dubai", href: "/transfers/abu-dhabi-airport-to-dubai" },
    { label: "Dubai Airport to Sharjah", href: "/transfers/dubai-airport-to-sharjah" },
  ],
};

export default function AirportRidesPage() {
  return <ServicePage content={content} />;
}
