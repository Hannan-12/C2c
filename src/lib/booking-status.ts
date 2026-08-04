import type { BOOKING_STATUSES } from "@/db/schema";

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * The status timeline shown to customers (docs Section 13.4).
 *
 * `cancelled` is deliberately not a step — it ends the timeline rather than
 * advancing it, and is rendered separately.
 */
export const TIMELINE: {
  status: Exclude<BookingStatus, "cancelled">;
  label: string;
  copy: string;
}[] = [
  {
    status: "requested",
    label: "Request received",
    copy: "We have your trip details and are checking availability.",
  },
  {
    status: "confirmed",
    label: "Booking confirmed",
    copy: "Your ride is confirmed. We're allocating a driver.",
  },
  {
    status: "assigned",
    label: "Driver assigned",
    copy: "Your driver's name and number are shown below.",
  },
  {
    status: "en_route",
    label: "On the way",
    copy: "Your driver is heading to the pickup point.",
  },
  {
    status: "completed",
    label: "Trip completed",
    copy: "Thanks for riding with us.",
  },
];

export function timelineIndex(status: BookingStatus): number {
  return TIMELINE.findIndex((step) => step.status === status);
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Request received",
  confirmed: "Confirmed",
  assigned: "Driver assigned",
  en_route: "On the way",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const SERVICE_LABEL: Record<string, string> = {
  ride: "Ride",
  hourly: "Hourly booking",
  city_tour: "City tour",
  airport: "Airport transfer",
  courier: "Courier",
};

export const VEHICLE_LABEL: Record<string, string> = {
  comfort: "Comfort",
  business: "Business",
  suv: "SUV",
  vip: "VIP",
  van: "Van",
};
