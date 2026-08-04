import { randomInt } from "crypto";

/**
 * Crockford base32 minus I, L, O, U — avoids characters customers misread or
 * mistype when reading a code off an email and into the tracking page.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const PREFIX = "C2C";
const BODY_LENGTH = 8;

/**
 * Generates a booking reference, e.g. C2C-7K4M2XQP.
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

/** Case-insensitive, tolerates a missing prefix and surrounding whitespace. */
export function normaliseReferenceCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, "");
  if (cleaned.startsWith(`${PREFIX}-`)) return cleaned;
  if (cleaned.startsWith(PREFIX)) return `${PREFIX}-${cleaned.slice(PREFIX.length)}`;
  return `${PREFIX}-${cleaned}`;
}

const REFERENCE_PATTERN = new RegExp(`^${PREFIX}-[${ALPHABET}]{${BODY_LENGTH}}$`);

export function isValidReferenceCode(code: string): boolean {
  return REFERENCE_PATTERN.test(code);
}
