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
