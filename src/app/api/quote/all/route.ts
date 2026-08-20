import { NextResponse } from "next/server";
import { z } from "zod";
import { SERVICE_TYPES } from "@/db/schema";
import { quoteAllCategories, QuoteError, RoutesApiError } from "@/lib/quote";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { dbErrorMessage } from "@/lib/db-error";

/**
 * Fares for every vehicle tier on one trip, for the booking flow's vehicle step.
 *
 * Shares the /api/quote budget deliberately: one call here measures the same
 * single route as one call there, so pricing five tiers should not cost five
 * times the allowance. The key is the same, so a client cannot lift its limit
 * by alternating between the two endpoints.
 */
const QUOTE_LIMIT = 60;
const QUOTE_WINDOW_MS = 10 * 60 * 1000;

const schema = z
  .object({
    serviceType: z.enum(SERVICE_TYPES),
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
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid quote request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await quoteAllCategories(parsed.data));
  } catch (error) {
    if (error instanceof QuoteError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof RoutesApiError) {
      // 404 means Google could not connect the two addresses — that is the
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
    console.error("All-category quote failed:", dbErrorMessage(error));
    return NextResponse.json({ error: "Could not calculate fares" }, { status: 500 });
  }
}
