import { NextResponse } from "next/server";
import { z } from "zod";
import { SERVICE_TYPES, VEHICLE_CATEGORIES } from "@/db/schema";
import { calculateQuote, QuoteError, RoutesApiError } from "@/lib/quote";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Live fare quote for the booking form's dock summary (docs Section 13.2).
 *
 * Each miss costs a billed Routes API element, so this is rate limited more
 * tightly than the booking submission itself.
 */
const QUOTE_LIMIT = 60;
const QUOTE_WINDOW_MS = 10 * 60 * 1000;

const quoteSchema = z
  .object({
    serviceType: z.enum(SERVICE_TYPES),
    vehicleCategory: z.enum(VEHICLE_CATEGORIES),
    pickupLocation: z.string().min(1).max(500),
    dropoffLocation: z.string().min(1).max(500).optional(),
    stops: z.array(z.string().min(1).max(500)).max(5).optional(),
    durationHours: z.number().int().min(1).max(24).optional(),
  })
  .refine((d) => d.serviceType === "hourly" || !!d.dropoffLocation, {
    message: "Dropoff location is required for this service type",
    path: ["dropoffLocation"],
  });

export async function POST(req: Request) {
  const limit = rateLimit(`quote:${clientIp(req)}`, QUOTE_LIMIT, QUOTE_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many quote requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const quote = await calculateQuote(parsed.data);
    return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof QuoteError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof RoutesApiError) {
      // 404 means Google could not connect the two addresses — that's the
      // customer's input, not our outage.
      const status = error.status === 404 ? 400 : 502;
      console.error("Routes API failure:", error.message);
      return NextResponse.json(
        {
          error:
            status === 400
              ? "We couldn't find a route between those locations. Please check the addresses."
              : "Fare estimation is temporarily unavailable. You can still submit your booking and we'll confirm the fare with you.",
        },
        { status },
      );
    }
    console.error("Quote failed:", error);
    return NextResponse.json({ error: "Could not calculate a fare" }, { status: 500 });
  }
}
