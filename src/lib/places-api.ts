/**
 * Google Places Autocomplete (New) client.
 *
 * Called from our own route handler rather than the browser, for two reasons:
 * the API key stays server-side, and it lets us cap usage. Places is billed
 * per request, and an autocomplete field fires on every keystroke — an
 * unproxied key on a public page is a bill waiting to happen.
 *
 * Results are restricted to the UAE and biased toward the emirates we serve,
 * so a customer typing "marina" gets Dubai Marina rather than Marina del Rey.
 */

const ENDPOINT = "https://places.googleapis.com/v1/places:autocomplete";

export type PlaceSuggestion = {
  /** Full text, used as the booking's address. */
  description: string;
  /** Bold part — usually the venue or street. */
  mainText: string;
  /** Remainder — city, emirate. */
  secondaryText: string;
  placeId: string;
};

export class PlacesApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "PlacesApiError";
  }
}

/** Short TTL: these are typed prefixes, and popular ones repeat constantly. */
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { value: PlaceSuggestion[]; expiresAt: number }>();

/**
 * Stand-in used when GOOGLE_PLACES_MOCK is set, so the field can be built and
 * demonstrated before the Places API is enabled on the client's key.
 * Never enable in production — these are not real lookups.
 */
const MOCK_PLACES = [
  "Dubai International Airport (DXB), Dubai",
  "Al Maktoum International Airport (DWC), Dubai",
  "Zayed International Airport (AUH), Abu Dhabi",
  "Sharjah International Airport (SHJ), Sharjah",
  "Burj Khalifa, Downtown Dubai",
  "Dubai Marina, Dubai",
  "Palm Jumeirah, Dubai",
  "Mall of the Emirates, Al Barsha, Dubai",
  "Business Bay, Dubai",
  "Jumeirah Beach Residence, Dubai",
  "Sheikh Zayed Road, Dubai",
  "Abu Dhabi Corniche, Abu Dhabi",
  "Yas Island, Abu Dhabi",
  "Sheikh Zayed Grand Mosque, Abu Dhabi",
  "Al Majaz Waterfront, Sharjah",
];

function mockSuggestions(input: string): PlaceSuggestion[] {
  const q = input.toLowerCase();
  return MOCK_PLACES.filter((p) => p.toLowerCase().includes(q))
    .slice(0, 5)
    .map((description, i) => {
      const [mainText, ...rest] = description.split(", ");
      return {
        description,
        mainText,
        secondaryText: rest.join(", "),
        placeId: `mock-${i}-${mainText}`,
      };
    });
}

export async function autocompletePlaces(
  input: string,
  /** Groups keystrokes into one billable session; pass the same token per field. */
  sessionToken?: string,
): Promise<PlaceSuggestion[]> {
  const query = input.trim();
  if (query.length < 3) return [];

  const key = query.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.value;

  const result =
    process.env.GOOGLE_PLACES_MOCK === "true"
      ? mockSuggestions(query)
      : await callPlacesApi(query, sessionToken);

  cache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

async function callPlacesApi(
  input: string,
  sessionToken?: string,
): Promise<PlaceSuggestion[]> {
  // Falls back to the Routes key: both are Google Maps Platform, and the
  // client will usually have one restricted key with both APIs enabled.
  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_ROUTES_API_KEY;
  if (!apiKey) {
    throw new PlacesApiError(
      "No Google API key set. Set GOOGLE_PLACES_API_KEY, or GOOGLE_PLACES_MOCK=true for local development.",
    );
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input,
        // Only the emirates we serve.
        includedRegionCodes: ["ae"],
        languageCode: "en",
        sessionToken,
      }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (error) {
    throw new PlacesApiError(
      `Places request failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new PlacesApiError(
      `Places API returned ${res.status}: ${detail.slice(0, 200)}`,
      res.status,
    );
  }

  const data = (await res.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId?: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }[];
  };

  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.text?.text))
    .map((p) => ({
      description: p.text!.text!,
      mainText: p.structuredFormat?.mainText?.text ?? p.text!.text!,
      secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
      placeId: p.placeId ?? p.text!.text!,
    }));
}
