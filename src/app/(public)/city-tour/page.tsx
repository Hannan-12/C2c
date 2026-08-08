import { ServicePage, type ServicePageContent } from "@/components/service-page";
import { ServicePhoto } from "@/components/service-photo";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "City Tours & Hourly Hire",
  description:
    "Hire a car and driver by the hour across Dubai, Abu Dhabi and Sharjah. Set your own route, stop where you like, priced by time rather than distance.",
  path: "/city-tour",
});

// TODO(client): supply the actual tour itineraries you run (which landmarks,
// typical duration, whether a guide is included). The page is built for a
// table of them — drop them into `table.rows` and the section appears.
const content: ServicePageContent = {
  eyebrow: "By the hour · Your route",
  title: (
    <>
      A driver for
      <br />
      the day, going
      <br />
      <span className="text-accent-strong">wherever you say.</span>
    </>
  ),
  intro:
    "Book the car by the hour instead of by the trip. Stop for lunch, change your mind, spend an hour somewhere you didn't plan to — the driver waits and the price is still by time, not distance.",
  included: [
    {
      title: "Priced by time",
      copy: "You book a number of hours. Stops, detours and waiting are already part of it, so nothing is added for changing your plans.",
    },
    {
      title: "The route is yours",
      copy: "No fixed itinerary unless you want one. Tell the driver where next and that's where you go.",
    },
    {
      title: "Waiting is included",
      copy: "The car stays with you between stops. You aren't rebooking each time you get out.",
    },
    {
      title: "Across the Emirates",
      copy: "Dubai, Abu Dhabi and Sharjah — including trips that cross between them within the same booking.",
    },
    {
      title: "Extend on the day",
      copy: "If the day runs long, message us on WhatsApp and we'll add the hours rather than cutting you off.",
    },
    {
      title: "Room for the group",
      copy: "Tell us how many are travelling and we send a vehicle class that seats everyone comfortably.",
    },
  ],
  table: {
    heading: "What the hours buy",
    note: "Hourly hire is priced on time booked. Pick a length when you book; extend it on the day if plans change.",
    caption: "Hourly booking lengths with typical use and included distance",
    columns: ["Booking", "Typical use", "Hours"],
    rows: [
      ["Half morning", "A few stops in one emirate", 2],
      ["Half day", "Downtown, the marina, lunch", 4],
      ["Long day", "Two emirates, unhurried", 6],
      ["Full day", "Dubai to Abu Dhabi and back", 8],
      ["Extended", "Arranged on WhatsApp", "10+"],
    ],
  },
  faqs: [
    {
      question: "What's the minimum booking?",
      answer:
        "Hourly bookings start at two hours. Beyond that you choose the length when you book, and it can be extended on the day if plans change.",
    },
    {
      question: "Is a tour guide included?",
      answer:
        "You're booking a car and driver rather than a guided tour. Drivers know the cities well and are happy to suggest stops, but they aren't licensed guides.",
    },
    {
      question: "Can we cross between emirates?",
      answer:
        "Yes. An hourly booking can start in Dubai and spend the afternoon in Abu Dhabi or Sharjah — it's the same booking, priced on the hours you use.",
    },
    {
      question: "Do you charge extra for stops?",
      answer:
        "No. Stops and waiting time are why the service is priced hourly rather than per trip.",
    },
  ],
  art: <ServicePhoto src="/images/city-tour.jpg" alt="Aerial view of the Dubai coastline and Burj Al Arab" priority />,
  schema: {
    name: "City Tours & Hourly Hire",
    description: "A car and driver booked by the hour, on your own route.",
    path: "/city-tour",
  },
  bookHref: "/book?serviceType=hourly",
};

export default function CityTourPage() {
  return <ServicePage content={content} />;
}
