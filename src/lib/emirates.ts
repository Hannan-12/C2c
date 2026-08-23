import { EMIRATES, type Emirate } from "@/db/schema";

export { EMIRATES };
export type { Emirate };

export const EMIRATE_LABEL: Record<Emirate, string> = {
  dubai: "Dubai",
  abu_dhabi: "Abu Dhabi",
  sharjah: "Sharjah",
};

/**
 * Which emirate a pickup address is probably in.
 *
 * Matched on the names and on the landmarks people actually type instead of a
 * city — nobody writes "Dubai" when they mean "DXB Terminal 3", and a booking
 * that reaches the wrong driver group is a booking nobody picks up.
 *
 * A guess, and treated as one: it sets the initial value and an operator can
 * change it. Deliberately conservative — an address naming no city at all
 * returns null rather than defaulting to Dubai, so the operator is asked
 * rather than quietly given the busiest group.
 */
const HINTS: [Emirate, RegExp][] = [
  [
    "abu_dhabi",
    /\b(abu\s*dhabi|abudhabi|auh|yas\s*island|saadiyat|al\s*reem|khalifa\s*city|masdar|corniche\s*abu|zayed\s*grand\s*mosque|mussafah|al\s*ain)\b/i,
  ],
  [
    "sharjah",
    /\b(sharjah|shj|al\s*majaz|al\s*khan|al\s*nahda\s*sharjah|muwaileh|al\s*qasimia)\b/i,
  ],
  [
    "dubai",
    /\b(dubai|dxb|dwc|deira|bur\s*dubai|jumeirah|marina|jbr|downtown|business\s*bay|burj|palm|silicon\s*oasis|al\s*barsha|tecom|difc|mirdif|jlt|creek)\b/i,
  ],
];

export function guessCity(...addresses: (string | null | undefined)[]): Emirate | null {
  const text = addresses.filter(Boolean).join(" ");
  if (!text.trim()) return null;

  /**
   * Abu Dhabi and Sharjah are tested before Dubai. An address like "Abu Dhabi
   * to Dubai Marina" names both, and the pickup is what decides which drivers
   * are nearby — so the more specific emirate wins over the one that appears
   * in half of all addresses.
   */
  for (const [emirate, pattern] of HINTS) {
    if (pattern.test(text)) return emirate;
  }

  return null;
}

/**
 * URL-safe forms of the emirate names.
 *
 * The stored value uses an underscore because it is a database enum;
 * /admin/drivers/abu-dhabi is what belongs in an address bar. Kept as an
 * explicit pair rather than a replace() in both directions, so a third emirate
 * added later cannot round-trip wrongly.
 */
export const EMIRATE_SLUG: Record<Emirate, string> = {
  dubai: "dubai",
  abu_dhabi: "abu-dhabi",
  sharjah: "sharjah",
};

export function emirateFromSlug(slug: string): Emirate | null {
  const found = EMIRATES.find((e) => EMIRATE_SLUG[e] === slug);
  return found ?? null;
}
