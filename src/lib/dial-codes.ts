/**
 * Country dialling codes for the phone field.
 *
 * Hand-kept rather than pulled from a package: the list changes about once a
 * decade, and a dependency that ships every country on earth would be larger
 * than the rest of the form. Ordered with the Emirates first, then the
 * countries this business actually sees, then the rest alphabetically — a
 * customer in Dubai should not scroll past Afghanistan to find AE.
 */
export type DialCode = {
  /** ISO 3166-1 alpha-2, and the key detection matches on. */
  iso: string;
  /** Digits only, no plus. Stored numbers are dial code + national number. */
  dial: string;
  name: string;
};

/** Where the business operates, and what an unknown visitor gets. */
export const DEFAULT_ISO = "AE";

export const DIAL_CODES: DialCode[] = [
  { iso: "AE", dial: "971", name: "United Arab Emirates" },
  { iso: "SA", dial: "966", name: "Saudi Arabia" },
  { iso: "OM", dial: "968", name: "Oman" },
  { iso: "QA", dial: "974", name: "Qatar" },
  { iso: "BH", dial: "973", name: "Bahrain" },
  { iso: "KW", dial: "965", name: "Kuwait" },
  { iso: "PK", dial: "92", name: "Pakistan" },
  { iso: "IN", dial: "91", name: "India" },
  { iso: "GB", dial: "44", name: "United Kingdom" },
  { iso: "US", dial: "1", name: "United States" },

  { iso: "AF", dial: "93", name: "Afghanistan" },
  { iso: "AL", dial: "355", name: "Albania" },
  { iso: "DZ", dial: "213", name: "Algeria" },
  { iso: "AR", dial: "54", name: "Argentina" },
  { iso: "AM", dial: "374", name: "Armenia" },
  { iso: "AU", dial: "61", name: "Australia" },
  { iso: "AT", dial: "43", name: "Austria" },
  { iso: "AZ", dial: "994", name: "Azerbaijan" },
  { iso: "BD", dial: "880", name: "Bangladesh" },
  { iso: "BY", dial: "375", name: "Belarus" },
  { iso: "BE", dial: "32", name: "Belgium" },
  { iso: "BR", dial: "55", name: "Brazil" },
  { iso: "BG", dial: "359", name: "Bulgaria" },
  { iso: "KH", dial: "855", name: "Cambodia" },
  { iso: "CM", dial: "237", name: "Cameroon" },
  { iso: "CA", dial: "1", name: "Canada" },
  { iso: "CN", dial: "86", name: "China" },
  { iso: "CO", dial: "57", name: "Colombia" },
  { iso: "HR", dial: "385", name: "Croatia" },
  { iso: "CY", dial: "357", name: "Cyprus" },
  { iso: "CZ", dial: "420", name: "Czechia" },
  { iso: "DK", dial: "45", name: "Denmark" },
  { iso: "EG", dial: "20", name: "Egypt" },
  { iso: "ET", dial: "251", name: "Ethiopia" },
  { iso: "FI", dial: "358", name: "Finland" },
  { iso: "FR", dial: "33", name: "France" },
  { iso: "GE", dial: "995", name: "Georgia" },
  { iso: "DE", dial: "49", name: "Germany" },
  { iso: "GH", dial: "233", name: "Ghana" },
  { iso: "GR", dial: "30", name: "Greece" },
  { iso: "HK", dial: "852", name: "Hong Kong" },
  { iso: "HU", dial: "36", name: "Hungary" },
  { iso: "ID", dial: "62", name: "Indonesia" },
  { iso: "IR", dial: "98", name: "Iran" },
  { iso: "IQ", dial: "964", name: "Iraq" },
  { iso: "IE", dial: "353", name: "Ireland" },
  { iso: "IL", dial: "972", name: "Israel" },
  { iso: "IT", dial: "39", name: "Italy" },
  { iso: "JP", dial: "81", name: "Japan" },
  { iso: "JO", dial: "962", name: "Jordan" },
  { iso: "KZ", dial: "7", name: "Kazakhstan" },
  { iso: "KE", dial: "254", name: "Kenya" },
  { iso: "LB", dial: "961", name: "Lebanon" },
  { iso: "LY", dial: "218", name: "Libya" },
  { iso: "MY", dial: "60", name: "Malaysia" },
  { iso: "MV", dial: "960", name: "Maldives" },
  { iso: "MT", dial: "356", name: "Malta" },
  { iso: "MU", dial: "230", name: "Mauritius" },
  { iso: "MX", dial: "52", name: "Mexico" },
  { iso: "MA", dial: "212", name: "Morocco" },
  { iso: "NP", dial: "977", name: "Nepal" },
  { iso: "NL", dial: "31", name: "Netherlands" },
  { iso: "NZ", dial: "64", name: "New Zealand" },
  { iso: "NG", dial: "234", name: "Nigeria" },
  { iso: "NO", dial: "47", name: "Norway" },
  { iso: "PS", dial: "970", name: "Palestine" },
  { iso: "PH", dial: "63", name: "Philippines" },
  { iso: "PL", dial: "48", name: "Poland" },
  { iso: "PT", dial: "351", name: "Portugal" },
  { iso: "RO", dial: "40", name: "Romania" },
  { iso: "RU", dial: "7", name: "Russia" },
  { iso: "RS", dial: "381", name: "Serbia" },
  { iso: "SG", dial: "65", name: "Singapore" },
  { iso: "SK", dial: "421", name: "Slovakia" },
  { iso: "ZA", dial: "27", name: "South Africa" },
  { iso: "KR", dial: "82", name: "South Korea" },
  { iso: "ES", dial: "34", name: "Spain" },
  { iso: "LK", dial: "94", name: "Sri Lanka" },
  { iso: "SD", dial: "249", name: "Sudan" },
  { iso: "SE", dial: "46", name: "Sweden" },
  { iso: "CH", dial: "41", name: "Switzerland" },
  { iso: "SY", dial: "963", name: "Syria" },
  { iso: "TW", dial: "886", name: "Taiwan" },
  { iso: "TZ", dial: "255", name: "Tanzania" },
  { iso: "TH", dial: "66", name: "Thailand" },
  { iso: "TN", dial: "216", name: "Tunisia" },
  { iso: "TR", dial: "90", name: "Türkiye" },
  { iso: "UG", dial: "256", name: "Uganda" },
  { iso: "UA", dial: "380", name: "Ukraine" },
  { iso: "UZ", dial: "998", name: "Uzbekistan" },
  { iso: "VN", dial: "84", name: "Vietnam" },
  { iso: "YE", dial: "967", name: "Yemen" },
];

export function dialFor(iso: string): string {
  return (DIAL_CODES.find((c) => c.iso === iso) ?? DIAL_CODES[0]).dial;
}

/**
 * Which country the visitor is probably in.
 *
 * Reads the browser's locale, which is the only signal available without
 * calling out to a geolocation service — and a lookup that leaks every
 * visitor's address to a third party to save one tap is not a trade worth
 * making.
 *
 * It is a guess and treated as one. Expats are the normal case here: someone
 * living in Dubai with an en-GB browser is common, so the guess only ever sets
 * the initial value and the customer can change it. Falls back to the Emirates,
 * which is right more often than anything else the browser could tell us.
 */
export function detectIso(): string {
  if (typeof navigator === "undefined") return DEFAULT_ISO;

  const tags = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean);

  for (const tag of tags) {
    let region: string | undefined;
    try {
      region = new Intl.Locale(tag).region ?? undefined;
    } catch {
      // A malformed tag from an unusual browser; try the next one.
      continue;
    }
    if (region && DIAL_CODES.some((c) => c.iso === region)) return region;
  }

  return DEFAULT_ISO;
}
