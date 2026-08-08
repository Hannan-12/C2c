import { ServicePage, type ServicePageContent } from "@/components/service-page";
import { ServicePhoto } from "@/components/service-photo";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Airport Transfers",
  description:
    "Airport transfers to and from DXB, DWC, AUH and Sharjah. Flight number on file so we track delays, with a fixed fare agreed before you fly.",
  path: "/airport-rides",
});

// TODO(client): confirm whether meet-and-greet inside the terminal is offered
// as standard or on request. Waiting-time allowance is now set in /terms.
const content: ServicePageContent = {
  eyebrow: "DXB · DWC · AUH · SHJ",
  title: (
    <>
      Your flight lands.
      <br />
      <span className="text-accent-strong">Your car is there.</span>
    </>
  ),
  intro:
    "Give us your flight number when you book. We watch the arrival time, so a delayed landing moves your pickup instead of costing you the car.",
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
    { label: "We watch the arrival", copy: "A delay moves the pickup. You don't message us from the air." },
    { label: "Driver is named", copy: "Their name and number reach you before you land." },
    { label: "Fare already agreed", copy: "Settled at booking, so nothing is negotiated at the kerb." },
  ],
  table: {
    heading: "Airports we cover",
    note: "Typical drive time to the city centre each airport serves.",
    caption: "Airports served with typical distance and drive time to the nearest city centre",
    columns: ["Airport", "Code", "To centre", "Drive"],
    // TODO(client): confirm these reference figures before launch. They are
    // researched approximations, in the same spirit as POPULAR_ROUTES.
    rows: [
      ["Dubai International", "DXB", "15 km", "20 min"],
      ["Al Maktoum", "DWC", "45 km", "40 min"],
      ["Abu Dhabi", "AUH", "35 km", "35 min"],
      ["Sharjah", "SHJ", "15 km", "25 min"],
    ],
  },
  included: [
    {
      title: "We follow the flight",
      copy: "Your flight number sits on the booking. If you land late, the driver's timing shifts with it — you don't need to message us mid-transit.",
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
      title: "Late and early runs",
      copy: "Red-eye arrivals and pre-dawn departures are normal bookings, not special requests.",
    },
    {
      title: "Driver details before landing",
      copy: "Name and number are on your tracking page once assigned, so you know who you're looking for.",
    },
    {
      title: "All four airports",
      copy: "Dubai International, Al Maktoum, Abu Dhabi and Sharjah — arrivals and departures both ways.",
    },
  ],
  faqs: [
    {
      question: "What if my flight is delayed?",
      answer:
        "We track the flight number you gave us and move the pickup to match the new arrival time. You don't need to do anything, though a WhatsApp message is always welcome if plans change entirely. You get 60 minutes of free waiting from the moment you actually land.",
    },
    {
      question: "Where does the driver meet me?",
      answer:
        "We agree the exact meeting point with you on WhatsApp before the day, since it differs by terminal. Message us on your reference code if you want to change it.",
    },
    {
      question: "Do you cover Abu Dhabi and Sharjah airports?",
      answer:
        "Yes — Dubai International (DXB), Al Maktoum (DWC), Abu Dhabi (AUH) and Sharjah (SHJ), in both directions.",
    },
    {
      question: "Can I book a return transfer at the same time?",
      answer:
        "Book each leg separately so each one gets its own reference code and driver, then mention on WhatsApp that they belong together and we'll keep them consistent.",
    },
  ],
  schema: {
    name: "Airport Transfers",
    description: "Airport pickups and drop-offs with flight tracking and 60 minutes of free waiting.",
    path: "/airport-rides",
  },
  bookHref: "/book?serviceType=airport",
};

export default function AirportRidesPage() {
  return <ServicePage content={content} />;
}
