import { payableFare, type FareBearing } from "@/lib/fare";

/**
 * How a fare is split between the business and the driver who earned it.
 *
 * One module because the same arithmetic has to hold in three places — the
 * dashboard totals, the per-driver settlement, and whatever a driver is told
 * they are owed. Three implementations of a percentage is three chances to
 * short someone.
 */

/** The business's cut, agreed with the client. The driver takes the rest. */
export const COMMISSION_PERCENT = 25;

export const DRIVER_PERCENT = 100 - COMMISSION_PERCENT;

const round2 = (n: number) => Math.round(n * 100) / 100;

export type Splittable = FareBearing & {
  paymentMethod: "cash" | "card";
  amountPaid: string | number | null;
  amountRefunded: string | number | null;
};

/**
 * What the business actually ended up with on a booking.
 *
 * Card is what Stripe settled less anything refunded — never the fare, because
 * a fare is a promise and a refund is a fact. Cash is the agreed fare, since
 * the driver collected it in full and nothing came back through us.
 *
 * Stripe's own fee is not deducted. The client's rule is 25% of the fare
 * charged, so the processing cost comes out of the business's share rather
 * than being shared with the driver — which is also the version a driver can
 * check against the fare they were told.
 */
export function netCollected(booking: Splittable): number {
  if (booking.paymentMethod === "cash") return payableFare(booking) ?? 0;

  const paid = Number(booking.amountPaid ?? 0);
  const refunded = Number(booking.amountRefunded ?? 0);

  return round2(Math.max(paid - refunded, 0));
}

export type Split = {
  /** What the business kept, or is owed on a cash trip. */
  company: number;
  /** What the driver earned, or already holds on a cash trip. */
  driver: number;
  net: number;
  /**
   * Positive when the business owes the driver, negative when the driver owes
   * the business. Card money arrives with us and has to go out; cash money
   * arrives with the driver and the commission has to come back.
   */
  balance: number;
};

export function splitFare(booking: Splittable): Split {
  const net = netCollected(booking);
  const company = round2((net * COMMISSION_PERCENT) / 100);
  // Subtracted rather than computed as its own percentage, so the two halves
  // always add back to the whole — 33.33 and 99.99 do not.
  const driver = round2(net - company);

  return {
    net,
    company,
    driver,
    balance: booking.paymentMethod === "cash" ? -company : driver,
  };
}

/**
 * Whether a trip has earned anything yet.
 *
 * Completed only. A booking that was cancelled, refunded in full, or never
 * driven owes the driver nothing — which is the rule the client chose: the
 * driver's share follows the money actually kept, so a refund reduces it.
 * Requiring a completed status as well means a paid-but-not-yet-driven booking
 * does not appear as a debt before anyone has done the work.
 */
export function isEarned(booking: { status: string }): boolean {
  return booking.status === "completed";
}
