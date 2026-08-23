/**
 * Turning what an operator typed into something matchable.
 *
 * Its own module rather than living inside the admin page because the rules
 * are fiddly enough to be worth testing on their own, and a phone number
 * matched wrongly means telling a customer their booking does not exist.
 */

/**
 * Digits a stored WhatsApp number would end with, given whatever was typed.
 *
 * Numbers are stored digits-only and international — 971589655634 — but nobody
 * types them that way while reading a phone screen. "+971 58 965 5634",
 * "058 965 5634" and "0589655634" all mean the same customer, so the search
 * matches on the tail: strip everything that is not a digit, drop a leading
 * country code or trunk zero, and compare against the end of the stored value.
 *
 * Null for anything too short to identify a person. A three-digit fragment
 * would match most of the table and read as a broken search rather than a
 * narrow one.
 */
const MIN_PHONE_DIGITS = 5;
const UAE_COUNTRY_CODE = "971";

export function phoneSuffix(query: string): string | null {
  let digits = query.replace(/\D/g, "");
  if (!digits) return null;

  /**
   * Order matters: the country code comes off before the trunk zero, because
   * a number written +971 0 58… carries both, and stripping the zero first
   * would leave the 971 in front of a number that no longer has one.
   */
  if (digits.startsWith(UAE_COUNTRY_CODE)) digits = digits.slice(UAE_COUNTRY_CODE.length);
  digits = digits.replace(/^0+/, "");

  return digits.length >= MIN_PHONE_DIGITS ? digits : null;
}
