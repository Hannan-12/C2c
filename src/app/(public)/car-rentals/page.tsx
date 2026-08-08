import { ServicePage, type ServicePageContent } from "@/components/service-page";
import { ServicePhoto } from "@/components/service-photo";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Car Rentals",
  description:
    "Self-drive car rental delivered to your door in Dubai, Abu Dhabi and Sharjah. Daily and weekly rates, arranged over WhatsApp.",
  path: "/car-rentals",
});

/**
 * TODO(client): rental terms are the one thing here that cannot be written
 * without you — minimum driver age, security deposit, mileage limits, licence
 * requirements for residents vs visitors, and insurance excess. The copy below
 * describes the service without stating any of those numbers, so nothing on
 * this page is a commitment you haven't made.
 */
const content: ServicePageContent = {
  eyebrow: "Self-drive · Delivered",
  title: (
    <>
      The keys,
      <br />
      <span className="text-accent-strong">brought to you.</span>
    </>
  ),
  intro:
    "Rent the car without the rental desk. Tell us the dates and where you are, and it arrives to you — no counter queue, no shuttle bus to an off-airport lot.",
  included: [
    {
      title: "Delivered and collected",
      copy: "The car comes to your home, hotel or office, and we pick it up from wherever you finish.",
    },
    {
      title: "Daily and weekly",
      copy: "Rent for a day, a week or longer. Longer bookings are priced better — ask when you enquire.",
    },
    {
      title: "Arranged by a person",
      copy: "Paperwork and requirements are handled over WhatsApp before delivery, so nothing is a surprise at handover.",
    },
    {
      title: "Across three emirates",
      copy: "Delivery and collection in Dubai, Abu Dhabi and Sharjah.",
    },
    {
      title: "Pay how you like",
      copy: "Cash, card or bank transfer, agreed when the booking is confirmed.",
    },
    {
      title: "Swap to a driver",
      copy: "If self-drive turns out not to suit the trip, we also run chauffeur rides and hourly hire.",
    },
  ],
  table: {
    heading: "The fleet",
    note: "Capacity by class. Rental rates depend on the vehicle and the length of hire — we quote them on WhatsApp before you commit.",
    caption: "Vehicle classes with passenger and luggage capacity",
    columns: ["Class", "Seats", "Bags"],
    // Capacity mirrors the seeded vehicle classes. Rates are deliberately
    // absent: the client has not set rental pricing, and inventing a number
    // here would be a commitment they never made.
    rows: [
      ["Comfort", 3, 2],
      ["Business", 3, 2],
      ["SUV", 5, 4],
      ["VIP", 3, 2],
      ["Van", 7, 6],
    ],
  },
  faqs: [
    {
      question: "What documents do I need?",
      answer:
        "It depends on whether you're a UAE resident or visiting, and on the vehicle. We confirm exactly what's required over WhatsApp before delivery, so you're never turned away at handover.",
    },
    {
      question: "Is there a security deposit?",
      answer:
        "Yes, and the amount depends on the vehicle. We tell you the figure when we confirm the booking, before you commit to anything.",
    },
    {
      question: "Can you deliver to the airport?",
      answer:
        "Yes — tell us the terminal and your arrival time when you enquire and we'll arrange handover there.",
    },
    {
      question: "What if I want to keep the car longer?",
      answer:
        "Message us on WhatsApp before the return date and we'll extend it, subject to the car not already being booked out.",
    },
  ],
  art: <ServicePhoto src="/images/car-rentals.jpg" alt="A car key being handed from one person to another" priority />,
  schema: {
    name: "Car Rentals",
    description: "Self-drive car hire delivered to your door.",
    path: "/car-rentals",
  },
  bookHref: "/book?serviceType=ride",
};

export default function CarRentalsPage() {
  return <ServicePage content={content} />;
}
