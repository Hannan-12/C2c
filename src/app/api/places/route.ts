import { NextResponse } from "next/server";
import { autocompletePlaces, PlacesApiError } from "@/lib/places-api";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Autocomplete proxy.
 *
 * Rate limited hard: this endpoint is public, fires per keystroke, and every
 * call is billed. 120 requests an hour is generous for a person filling a
 * booking form and cheap to abuse against.
 */
const LOOKUP_LIMIT = 120;
const LOOKUP_WINDOW_MS = 60 * 60 * 1000;

export async function GET(req: Request) {
  const limit = rateLimit(`places:${clientIp(req)}`, LOOKUP_LIMIT, LOOKUP_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { suggestions: [] },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { searchParams } = new URL(req.url);
  const input = searchParams.get("q") ?? "";
  const sessionToken = searchParams.get("session") ?? undefined;

  try {
    const suggestions = await autocompletePlaces(input, sessionToken);
    return NextResponse.json({ suggestions });
  } catch (error) {
    // A lookup failure must never block a booking — the field stays usable as
    // a plain text input, so the customer can type the address themselves.
    if (error instanceof PlacesApiError) {
      console.error("Places lookup failed:", error.message);
    } else {
      console.error("Places lookup failed:", error);
    }
    return NextResponse.json({ suggestions: [] });
  }
}
