/**
 * The one active promotion: 20% off a return ride, advertised on the
 * homepage banner and applied when a booking arrives with this code.
 *
 * Single source for the code and the percentage so the banner, the booking
 * form's display price, and the amount actually charged cannot drift apart —
 * a discount that reads 20% on the page and less on the invoice is worse
 * than no discount at all.
 */
export const RETURN_RIDE_PROMO_CODE = "return20";
export const RETURN_RIDE_DISCOUNT_PERCENT = 20;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function applyReturnRideDiscount(fare: number): number {
  return round2(fare * (1 - RETURN_RIDE_DISCOUNT_PERCENT / 100));
}
