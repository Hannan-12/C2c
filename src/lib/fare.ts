/**
 * Which figure a booking is actually worth.
 *
 * Two fares can exist on a booking: the estimate the system calculated from
 * the route, and the fare a person agreed with the customer afterwards. The
 * agreed one wins wherever money is involved — the payment link, the tracking
 * page, the confirmation email — because it is the number the customer was
 * told and the only one they consented to.
 *
 * One function rather than `agreedFare ?? fareEstimate` written out at each
 * call site: those are five places that must not disagree, and the one that
 * drifts would be the one that charges the card.
 */
export type FareBearing = {
  fareEstimate: string | number | null;
  agreedFare: string | number | null;
};

function toNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** What the customer pays, or null when no fare has been settled at all. */
export function payableFare(booking: FareBearing): number | null {
  return toNumber(booking.agreedFare) ?? toNumber(booking.fareEstimate);
}

/**
 * True when a person has overridden the calculated estimate with a different
 * figure. An override that happens to match the estimate is not worth showing
 * as a change, so the comparison is on value rather than on presence.
 */
export function fareWasAgreed(booking: FareBearing): boolean {
  const agreed = toNumber(booking.agreedFare);
  if (agreed === null) return false;

  const estimate = toNumber(booking.fareEstimate);
  return estimate === null || agreed !== estimate;
}
