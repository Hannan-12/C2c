/**
 * Google Routes API client (computeRoutes).
 *
 * Routes API rather than the older Distance Matrix API, which is Google's
 * legacy product and on a deprecation path (docs Section 6).
 *
 * Billing is per element, so results are cached by rounded coordinates: a
 * customer nudging the form or re-submitting shouldn't cost another call.
 */

export type RouteLeg = { distanceKm: number; durationMin: number };

export type RouteQuery = {
  origin: string;
  destination: string;
  /** Optional intermediate stops, in order. */
  waypoints?: string[];
};

const ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { value: RouteLeg; expiresAt: number }>();

export class RoutesApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "RoutesApiError";
  }
}

function cacheKey(q: RouteQuery): string {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return [norm(q.origin), norm(q.destination), (q.waypoints ?? []).map(norm).join("|")].join("::");
}

/**
 * Straight-line distance, inflated to approximate road distance.
 *
 * Only used when GOOGLE_ROUTES_MOCK is set, so the fare logic and the booking
 * form can be developed before a billed API key exists. Never enable this in
 * production — the numbers are indicative, not real.
 */
function mockRoute(q: RouteQuery): RouteLeg {
  let hash = 0;
  const key = cacheKey(q);
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const distanceKm = 5 + (Math.abs(hash) % 4500) / 100; // 5–50 km, stable per route
  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationMin: Math.round(distanceKm * 1.6 + 5),
  };
}

export async function computeRoute(q: RouteQuery): Promise<RouteLeg> {
  const key = cacheKey(q);
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.value;

  const result = process.env.GOOGLE_ROUTES_MOCK === "true"
    ? mockRoute(q)
    : await callRoutesApi(q);

  cache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

async function callRoutesApi(q: RouteQuery): Promise<RouteLeg> {
  const apiKey = process.env.GOOGLE_ROUTES_API_KEY;
  if (!apiKey) {
    throw new RoutesApiError(
      "GOOGLE_ROUTES_API_KEY is not set. Set it, or set GOOGLE_ROUTES_MOCK=true for local development.",
    );
  }

  const body = {
    origin: { address: q.origin },
    destination: { address: q.destination },
    intermediates: q.waypoints?.map((address) => ({ address })),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    units: "METRIC",
  };

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // Field mask is required by the Routes API and keeps the response small.
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    throw new RoutesApiError(
      `Routes API request failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new RoutesApiError(
      `Routes API returned ${res.status}: ${detail.slice(0, 200)}`,
      res.status,
    );
  }

  const data = (await res.json()) as {
    routes?: { distanceMeters?: number; duration?: string }[];
  };

  const route = data.routes?.[0];
  if (!route?.distanceMeters || !route.duration) {
    throw new RoutesApiError("No route found between those locations", 404);
  }

  // duration comes back as a protobuf duration string, e.g. "1234s"
  const seconds = parseInt(route.duration.replace("s", ""), 10);

  return {
    distanceKm: Math.round((route.distanceMeters / 1000) * 100) / 100,
    durationMin: Math.round(seconds / 60),
  };
}
