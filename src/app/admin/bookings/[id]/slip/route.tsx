import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingAssignments, drivers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";
import { slipFields, slipTitle } from "@/lib/slips";

/**
 * A job slip as a picture.
 *
 * Drivers get these in WhatsApp, where a pasted block of text is one message
 * among hundreds and collapses after four lines. An image survives being
 * forwarded, stays legible in a group, and can be opened at a red light — which
 * is where a driver actually reads it.
 *
 * Rendered on the server rather than drawn in the browser so the same slip
 * comes out of any device, and so the figures are read from the booking at the
 * moment of download rather than from whatever the page was showing.
 */

export const runtime = "nodejs";

const WIDTH = 900;

/**
 * Height is computed, not fixed.
 *
 * ImageResponse defaults to 630px whatever the content, which quietly cropped
 * the last line off a driver slip — the one carrying the fare. These are
 * measured from the rendered rows rather than guessed: a slip that loses its
 * bottom line is worse than no slip, because nobody notices it is missing.
 */
const HEADER_H = 92;
const TITLE_H = 74;
const ROW_H = 56;
const FOOTER_H = 78;
const PADDING_V = 60;

function heightFor(rows: number): number {
  return HEADER_H + PADDING_V + TITLE_H + rows * ROW_H + FOOTER_H;
}

/** Sampled from the site so a slip in a group is recognisably the business. */
const INK = "#1c1a19";
const CREAM = "#f2ede6";
const AMBER = "#fda51c";
const MUTED = "#9c948c";
const LINE = "#332f2b";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();

  const { id } = await params;
  const audience = new URL(req.url).searchParams.get("for") === "driver" ? "driver" : "group";

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!booking) return new Response("Not found", { status: 404 });

  const [assignment] = await db
    .select({ driverName: drivers.name })
    .from(bookingAssignments)
    .innerJoin(drivers, eq(drivers.id, bookingAssignments.driverId))
    .where(eq(bookingAssignments.bookingId, booking.id))
    .limit(1);

  /**
   * The same two shapes the text slips use. A picture that says something
   * different from the message beside it is worse than having only one of
   * them, so both read from one place.
   */
  const fields = slipFields(booking, {
    audience,
    driverName: assignment?.driverName ?? null,
  });

  const title = slipTitle(booking, audience);

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          display: "flex",
          flexDirection: "column",
          background: INK,
          color: CREAM,
          fontSize: 26,
          padding: 0,
        }}
      >
        {/* Header: the amber dot and wordmark the site uses, drawn rather than
            loaded, so the slip needs no network access to render. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "28px 40px 22px",
            borderBottom: `2px solid ${LINE}`,
          }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 16, background: AMBER }} />
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>
            Ride On Click
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 22, color: MUTED }}>{booking.referenceCode}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "26px 40px 34px" }}>
          <div
            style={{
              fontSize: 38,
              fontWeight: 700,
              color: audience === "driver" ? AMBER : CREAM,
              letterSpacing: -0.8,
              marginBottom: 24,
            }}
          >
            {title}
          </div>

          {fields.map((field) => (
            <div
              key={field.label}
              style={{
                display: "flex",
                gap: 20,
                padding: "11px 0",
                borderTop: `1px solid ${LINE}`,
                alignItems: "flex-start",
              }}
            >
              <div style={{ width: 190, color: MUTED, fontSize: 22, flexShrink: 0 }}>
                {field.label}
              </div>
              <div
                style={{
                  flex: 1,
                  fontSize: 26,
                  fontWeight: field.strong ? 700 : 400,
                  color: field.strong ? AMBER : CREAM,
                }}
              >
                {field.value}
              </div>
            </div>
          ))}

          <div
            style={{
              display: "flex",
              marginTop: 26,
              paddingTop: 18,
              borderTop: `2px solid ${LINE}`,
              color: MUTED,
              fontSize: 21,
            }}
          >
            {audience === "driver"
              ? "Message the office if anything changes."
              : "Reply with the job number if you can take it."}
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: heightFor(fields.length),
      headers: {
        // Names, numbers and addresses on a driver slip. Nothing caches it.
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${booking.referenceCode}-${audience}.png"`,
      },
    },
  );
}
