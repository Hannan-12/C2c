import type { BOOKING_STATUSES, CancellationReason } from "@/db/schema";
import { FREE_CANCEL_HOURS, LATE_CANCEL_PERCENT } from "@/lib/service-terms";

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
    status: "awaiting_confirmation",
    label: "Awaiting your confirmation",
    copy: "We've messaged you on WhatsApp to confirm the details.",
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
  awaiting_confirmation: "Awaiting customer",
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

/**
 * Cancellation reasons in the operator's words, and in the refund policy's.
 *
 * The wording deliberately names the consequence — "no charge", "50% due" —
 * because the person choosing from this list is often the one who will then
 * decide a refund, and making them recall the policy from memory is how the
 * wrong amount gets returned.
 */
export const CANCELLATION_REASON_LABEL: Record<CancellationReason, string> = {
  customer_early: `Customer cancelled, more than ${FREE_CANCEL_HOURS}h before pickup — no charge`,
  customer_late: `Customer cancelled, less than ${FREE_CANCEL_HOURS}h before pickup — ${LATE_CANCEL_PERCENT}% due`,
  customer_no_show: "Customer did not show — full fare due",
  we_cancelled: "We cancelled — refunded in full",
  duplicate: "Duplicate or test booking",
  other: "Something else",
};

/**
 * Statuses that mean the booking is agreed with the customer.
 *
 * An admin can jump straight from "requested" to "assigned" without passing
 * through "confirmed", so anything keyed on "we have said yes" has to test the
 * whole set rather than one value.
 */
export const CONFIRMED_STATUSES: BookingStatus[] = [
  "confirmed",
  "assigned",
  "en_route",
  "completed",
];
