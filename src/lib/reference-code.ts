import { randomInt } from "crypto";

/**
 * Crockford base32 minus I, L, O, U — avoids characters customers misread or
 * mistype when reading a code off an email and into the tracking page.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** What new codes carry: Ride On Click. */
const PREFIX = "ROC";

/**
 * What old codes carry.
 *
 * The platform was built against a competitor's site as a reference and took
 * its initials into the booking reference. Renaming the prefix cannot be a
 * simple swap: customers are holding C2C- codes in emails, on tracking pages
 * and in WhatsApp threads, and a booking whose code stops resolving is a
 * customer locked out of the only record they have of a trip they paid for.
 *
 * So both are accepted forever, and only the new one is issued. This costs a
 * few lines and never has to be revisited; the alternative is a cutover date
 * that someone has to remember and that strands anyone who booked before it.
 */
const LEGACY_PREFIXES = ["C2C"] as const;

const ALL_PREFIXES = [PREFIX, ...LEGACY_PREFIXES];

const BODY_LENGTH = 8;

/**
 * Generates a booking reference, e.g. ROC-7K4M2XQP.
 *
 * Long and random rather than short and sequential (docs Section 5.1): the
 * tracking page is unauthenticated and returns customer name, WhatsApp number
 * and pickup address, so a guessable code would expose the customer list.
 * 32^8 ≈ 1.1 trillion combinations makes enumeration impractical.
 *
 * Uses crypto.randomInt, not Math.random — the latter is predictable and would
 * defeat the point.
 */
export function generateReferenceCode(): string {
  let body = "";
  for (let i = 0; i < BODY_LENGTH; i++) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${PREFIX}-${body}`;
}

/**
 * Case-insensitive, tolerates surrounding whitespace, and accepts a code with
 * either prefix, with a missing hyphen, or with no prefix at all.
 *
 * A code arriving with a recognised prefix keeps it — that is what makes an
 * old C2C- booking still findable. A bare body gets the current prefix, since
 * a customer typing only the eight characters is almost certainly reading a
 * new code.
 */
export function normaliseReferenceCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, "");

  for (const prefix of ALL_PREFIXES) {
    if (cleaned.startsWith(`${prefix}-`)) return cleaned;
    if (cleaned.startsWith(prefix)) return `${prefix}-${cleaned.slice(prefix.length)}`;
  }

  return `${PREFIX}-${cleaned}`;
}

const REFERENCE_PATTERN = new RegExp(
  `^(?:${ALL_PREFIXES.join("|")})-[${ALPHABET}]{${BODY_LENGTH}}$`,
);

export function isValidReferenceCode(code: string): boolean {
  return REFERENCE_PATTERN.test(code);
}

/**
 * The eight characters without whichever prefix they carry.
 *
 * For search, where an operator pastes a full code but the stored value might
 * begin either way — matching on the body finds the booking regardless.
 */
export function referenceBody(code: string): string {
  return normaliseReferenceCode(code).replace(
    new RegExp(`^(?:${ALL_PREFIXES.join("|")})-`),
    "",
  );
}
