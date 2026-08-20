import type { VehicleCategory } from "@/db/schema";

/**
 * What each tier is and what it holds.
 *
 * Lives outside the booking form because the server needs it too: capacity is
 * a rule, not a presentation detail. A booking for eight passengers in a
 * three-seat saloon is one the business cannot fulfil, and it should be
 * refused wherever it arrives from — our form, a future app, or a curl.
 *
 * Rates are not here. Those live in the vehicle_pricing table so the client
 * can change a fare without a deploy; `from` is only the published headline
 * shown before a trip has been measured.
 */
export type VehicleSpec = {
  id: VehicleCategory;
  label: string;
  /** Body style, in the customer's words rather than ours. */
  blurb: string;
  seats: number;
  bags: number;
  /** Headline price, shown until a real fare for the trip arrives. */
  from: number;
  /**
   * TODO(client): free waiting minutes, meet & greet, porter service, water,
   * wifi. Competitors list these per tier and they are a real reason to choose
   * one over another — but each is a promise made to a customer on the
   * client's behalf, so they stay empty until confirmed. The row renders
   * without them.
   */
  inclusions?: string[];
};

export const VEHICLE_SPECS: VehicleSpec[] = [
  { id: "comfort", label: "Comfort", blurb: "Saloon", seats: 3, bags: 2, from: 45 },
  { id: "business", label: "Business", blurb: "Executive saloon", seats: 3, bags: 3, from: 85 },
  { id: "suv", label: "SUV", blurb: "Large 4x4", seats: 5, bags: 4, from: 120 },
  { id: "vip", label: "VIP", blurb: "First class", seats: 3, bags: 3, from: 220 },
  { id: "van", label: "Van", blurb: "People carrier", seats: 7, bags: 6, from: 110 },
];

export function vehicleSpec(category: VehicleCategory): VehicleSpec | undefined {
  return VEHICLE_SPECS.find((v) => v.id === category);
}

/** The smallest tier that takes this many people and bags, if any does. */
export function smallestFitting(
  passengers: number,
  bags: number,
): VehicleSpec | undefined {
  return [...VEHICLE_SPECS]
    .sort((a, b) => a.from - b.from)
    .find((v) => v.seats >= passengers && v.bags >= bags);
}
