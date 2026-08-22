/**
 * The service promises the business actually makes, in one place.
 *
 * These numbers appear in two registers: the legal prose on /terms and the
 * short claims customers see while booking. They must agree — a trust strip
 * offering free cancellation for 24 hours above terms that say 12 is a
 * contradiction the customer will find at the worst possible moment, and the
 * published figure is the one the business is held to.
 *
 * Changing a number here changes both.
 */

/** Cancel free up to this many hours before pickup. */
export const FREE_CANCEL_HOURS = 12;

/** Charged if cancelled after a driver has been assigned. */
export const LATE_CANCEL_PERCENT = 50;

/** Free waiting at ordinary pickup points, in minutes. */
export const WAIT_STANDARD_MIN = 15;

/** Free waiting at airports, measured from actual landing time. */
export const WAIT_AIRPORT_MIN = 60;

/** Shortest bookable hourly hire. Also enforced in createBookingSchema. */
export const HOURLY_MINIMUM = 2;

/**
 * Refund timings, split because they are two different promises.
 *
 * The first is ours and we control it: a person reads the request, decides it
 * against the policy, and sends the money. The second is the customer's bank
 * and we control nothing about it. Publishing them as one figure would either
 * overpromise our part or make us look slow for someone else's delay — and a
 * customer who thinks the deadline has passed is a customer opening a dispute.
 *
 * Refunds are deliberately not automatic. Each one is reviewed by hand against
 * the cancellation rules above, which is why the first number is a review
 * window and not an instant.
 */
export const REFUND_REVIEW_DAYS_LABEL = "1–2";

/** How long the customer's bank then takes to show it. Not ours to promise. */
export const REFUND_BANK_DAYS_LABEL = "5–10";
