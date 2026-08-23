import { formatDistance, formatDuration, formatFare, formatPickup } from "@/lib/format";
import { payableFare } from "@/lib/fare";
import { splitFare } from "@/lib/commission";
import { SERVICE_LABEL, VEHICLE_LABEL } from "@/lib/booking-status";
import { EMIRATE_LABEL } from "@/lib/emirates";
import type { Booking } from "@/db/schema";

/**
 * The two messages a job produces, both written for WhatsApp.
 *
 * A job goes out twice: once to a city's driver group asking who is free, and
 * once to the driver who took it. They are deliberately different messages,
 * not the same one sent twice.
 */

type SlipBooking = Pick<
  Booking,
  | "referenceCode"
  | "serviceType"
  | "pickupLocation"
  | "dropoffLocation"
  | "pickupDatetime"
  | "durationHours"
  | "vehicleCategory"
  | "passengerCount"
  | "luggageCount"
  | "distanceKm"
  | "durationMin"
  | "city"
  | "flightNumber"
  | "customerName"
  | "customerWhatsapp"
  | "paymentMethod"
  | "fareEstimate"
  | "agreedFare"
  | "amountPaid"
  | "amountRefunded"
>;

function tripLines(booking: SlipBooking): string[] {
  const lines = [
    `${SERVICE_LABEL[booking.serviceType] ?? booking.serviceType}${
      booking.city ? ` · ${EMIRATE_LABEL[booking.city]}` : ""
    }`,
    `When: ${formatPickup(booking.pickupDatetime)}`,
    `From: ${booking.pickupLocation}`,
  ];

  if (booking.dropoffLocation) lines.push(`To: ${booking.dropoffLocation}`);
  if (booking.durationHours) lines.push(`Duration: ${booking.durationHours} hours`);

  const trip = [
    booking.distanceKm != null ? formatDistance(Number(booking.distanceKm)) : null,
    booking.durationMin != null ? formatDuration(booking.durationMin) : null,
  ].filter(Boolean);
  if (trip.length) lines.push(`Trip: ${trip.join(" · ")}`);

  lines.push(
    `Vehicle: ${VEHICLE_LABEL[booking.vehicleCategory] ?? booking.vehicleCategory}`,
    `Passengers: ${booking.passengerCount}, bags: ${booking.luggageCount}`,
  );

  return lines;
}

/**
 * Sent to a city's driver group to find out who is free.
 *
 * Carries no customer details and no money. Everyone in the group sees this,
 * including the drivers who will not do the job and whoever is still in the
 * group after leaving — so a name and number would be handed to people with no
 * reason to have them. Leaving the fare out also stops the group being picked
 * over for the expensive jobs while the ordinary ones go unanswered.
 *
 * The reference is included because a driver has to be able to say which job
 * they are replying about.
 */
export function availabilitySlip(booking: SlipBooking): string {
  return [
    `JOB ${booking.referenceCode} — who's free?`,
    "",
    ...tripLines(booking),
    "",
    "Reply with the job number if you can take it.",
  ].join("\n");
}

/**
 * Sent to the driver who got the job. This one is the real thing.
 *
 * Everything the group slip withheld: who the customer is, how to reach them,
 * the flight if there is one, and what the driver earns. It is addressed to one
 * person who is now doing the trip, so the reasons for withholding are gone.
 */
export function jobSlip(booking: SlipBooking, driverName: string): string {
  const fare = payableFare(booking);
  const split = splitFare(booking);

  const lines = [
    `CONFIRMED — ${booking.referenceCode}`,
    `Driver: ${driverName}`,
    "",
    ...tripLines(booking),
    "",
    `Customer: ${booking.customerName}`,
    `Phone: +${booking.customerWhatsapp}`,
  ];

  if (booking.flightNumber) lines.push(`Flight: ${booking.flightNumber}`);

  lines.push("");

  if (fare !== null) {
    lines.push(
      booking.paymentMethod === "cash"
        ? `Collect ${formatFare(fare)} in cash from the customer.`
        : `Fare ${formatFare(fare)} — already paid by card. Do not collect cash.`,
      `Your share: ${formatFare(split.driver)}`,
    );
  } else {
    lines.push("Fare not set — check with the office before the pickup.");
  }

  lines.push("", "Message the office if anything changes.");

  return lines.join("\n");
}


export type SlipField = { label: string; value: string; strong?: boolean };

/**
 * The slip as label/value pairs, for the rendered picture.
 *
 * Shares its rules with the text versions above rather than restating them: a
 * picture that disagrees with the message beside it is worse than having only
 * one of the two, and the rule being shared is the one that matters — what a
 * whole group is allowed to see.
 */
export function slipFields(
  booking: SlipBooking,
  opts: { audience: "group" | "driver"; driverName?: string | null },
): SlipField[] {
  const fields: SlipField[] = [
    {
      label: "Service",
      value: `${SERVICE_LABEL[booking.serviceType] ?? booking.serviceType}${
        booking.city ? ` · ${EMIRATE_LABEL[booking.city]}` : ""
      }`,
    },
    { label: "When", value: formatPickup(booking.pickupDatetime), strong: true },
    { label: "From", value: booking.pickupLocation },
  ];

  if (booking.dropoffLocation) fields.push({ label: "To", value: booking.dropoffLocation });
  if (booking.durationHours) {
    fields.push({ label: "Duration", value: `${booking.durationHours} hours` });
  }

  const trip = [
    booking.distanceKm != null ? formatDistance(Number(booking.distanceKm)) : null,
    booking.durationMin != null ? formatDuration(booking.durationMin) : null,
  ].filter(Boolean);
  if (trip.length) fields.push({ label: "Trip", value: trip.join(" · ") });

  fields.push(
    {
      label: "Vehicle",
      value: VEHICLE_LABEL[booking.vehicleCategory] ?? booking.vehicleCategory,
    },
    {
      label: "Passengers",
      value: `${booking.passengerCount} · ${booking.luggageCount} bags`,
    },
  );

  // Everything below is withheld from a group slip: a customer's details and
  // the money are for the one driver actually doing the trip.
  if (opts.audience === "driver") {
    if (opts.driverName) fields.push({ label: "Driver", value: opts.driverName });

    fields.push(
      { label: "Customer", value: booking.customerName },
      { label: "Phone", value: `+${booking.customerWhatsapp}` },
    );

    if (booking.flightNumber) fields.push({ label: "Flight", value: booking.flightNumber });

    const fare = payableFare(booking);
    if (fare !== null) {
      const split = splitFare(booking);
      fields.push({
        label: booking.paymentMethod === "cash" ? "Collect in cash" : "Already paid",
        value:
          booking.paymentMethod === "cash"
            ? formatFare(fare)
            : `${formatFare(fare)} — take no cash`,
        strong: true,
      });
      fields.push({ label: "Your share", value: formatFare(split.driver), strong: true });
    } else {
      fields.push({ label: "Fare", value: "Not set — check with the office" });
    }
  }

  return fields;
}

/** The line at the top of a slip, which is also what it is for. */
export function slipTitle(booking: SlipBooking, audience: "group" | "driver"): string {
  return audience === "driver" ? "Job confirmed" : "Who's free?";
}
