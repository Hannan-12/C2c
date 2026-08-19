import { formatDistance, formatDuration, formatFare, formatPickup } from "@/lib/format";
import type { ServiceType } from "@/db/schema";
import { BRAND, siteUrl } from "@/lib/seo";
import type { EmailMessage } from "./client";

/** The fields both templates render. A row from `bookings` satisfies this. */
export type BookingEmailData = {
  referenceCode: string;
  serviceType: ServiceType;
  customerName: string;
  customerEmail: string;
  pickupLocation: string;
  dropoffLocation?: string | null;
  pickupDatetime: Date | string;
  durationHours?: number | null;
  flightNumber?: string | null;
  distanceKm?: number | null;
  durationMin?: number | null;
  fareEstimate?: number | null;
};

const SERVICE_LABEL: Record<ServiceType, string> = {
  ride: "Ride",
  hourly: "Hourly booking",
  city_tour: "City tour",
  airport: "Airport transfer",
  courier: "Courier",
};

/**
 * Values come from a public booking form and land inside an HTML document, so
 * every one is escaped. An unescaped `&` alone is enough to corrupt the markup.
 */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function trackingUrl(referenceCode: string): string {
  return `${siteUrl()}/track/${encodeURIComponent(referenceCode)}`;
}

/** Label/value pairs shared by both emails, built once so they can't drift apart. */
function detailRows(booking: BookingEmailData): [string, string][] {
  // Reference is deliberately absent: the HTML gives it its own panel, so
  // repeating it here would print it twice.
  const rows: [string, string][] = [
    ["Service", SERVICE_LABEL[booking.serviceType]],
    ["Pickup", booking.pickupLocation],
  ];

  if (booking.dropoffLocation) rows.push(["Drop-off", booking.dropoffLocation]);
  if (booking.durationHours) rows.push(["Duration booked", `${booking.durationHours} hours`]);
  if (booking.flightNumber) rows.push(["Flight", booking.flightNumber]);

  rows.push(["Pickup time", formatPickup(booking.pickupDatetime)]);

  const trip = [
    booking.distanceKm != null ? formatDistance(booking.distanceKm) : null,
    booking.durationMin != null ? formatDuration(booking.durationMin) : null,
  ].filter(Boolean);
  if (trip.length) rows.push(["Estimated trip", trip.join(" · ")]);

  if (booking.fareEstimate != null) {
    rows.push(["Estimated fare", formatFare(booking.fareEstimate)]);
  }

  return rows;
}

/**
 * Font stacks approximating the site's faces.
 *
 * The site loads Archivo and Geist from Google Fonts; an email cannot rely on
 * a webfont, since most clients strip @font-face and a <link> would be a
 * blocked remote request. So each stack names the real face first — honoured
 * by the handful of clients that can, and by anyone who has it installed —
 * then falls back to the closest system grotesque. The display treatment
 * survives regardless, because the weight and tight tracking do most of the
 * work, not the face itself.
 */
const BODY_FONT = `Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
const DISPLAY_FONT = `Archivo,'Helvetica Neue',Helvetica,Arial,sans-serif`;
const MONO_FONT = `'Geist Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;

/**
 * Email HTML, not page HTML: tables and inline styles, because Outlook and
 * Gmail strip <style> blocks and ignore most modern layout. No images, so
 * nothing breaks when a client blocks remote content by default.
 */
function layout(opts: {
  heading: string;
  intro: string;
  booking: BookingEmailData;
  ctaLabel: string;
  footer: string;
  /** Stripe Checkout URL. Set only for confirmed card bookings. */
  payUrl?: string;
}): string {
  // The site's field labels: tiny, uppercase, wide tracking, faint ink.
  const rows = detailRows(opts.booking)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:9px 0;color:#9c948c;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.09em;">${esc(label)}</td>
          <td style="padding:9px 0;color:#1c1a19;font-size:14px;font-weight:600;text-align:right;">${esc(value)}</td>
        </tr>`,
    )
    .join("");

  const link = trackingUrl(opts.booking.referenceCode);

  /**
   * Card bookings get a second, primary button. Pay leads and tracking becomes
   * the quiet outline button — the amber fill is the email's one loud element
   * and it should sit on the action we are asking for.
   */
  const payButton = opts.payUrl
    ? `
              <td style="background:#eba43c;border-radius:9px;">
                <a href="${esc(opts.payUrl)}"
                   style="display:inline-block;padding:13px 26px;color:#1c1a19;font-size:14px;font-weight:600;text-decoration:none;">
                  Pay now
                </a>
              </td>
              <td style="width:10px;font-size:0;line-height:0;">&nbsp;</td>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 12px;background:#f7f4ef;font-family:${BODY_FONT};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
      <tr>
        <td style="background:#1c1a19;border-radius:14px 14px 0 0;padding:22px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <!--
                The dock's amber dot, drawn as a rounded cell so it needs no
                image. Dimensions are set on an inner block: a bare table cell
                collapses to the text's line box and renders as a bar.
              -->
              <td style="font-size:0;line-height:0;">
                <div style="width:9px;height:9px;background:#eba43c;border-radius:9px;font-size:0;line-height:9px;">&nbsp;</div>
              </td>
              <td style="padding-left:10px;color:#f2ede6;font-size:18px;font-weight:700;letter-spacing:-0.02em;font-family:${DISPLAY_FONT};">${BRAND}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;padding:32px 28px;border:1px solid #e6e0d7;border-top:0;border-radius:0 0 14px 14px;">
          <h1 style="margin:0 0 12px;color:#1c1a19;font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.15;font-family:${DISPLAY_FONT};">${esc(opts.heading)}</h1>
          <p style="margin:0 0 26px;color:#6f6862;font-size:15px;line-height:1.65;">${esc(opts.intro)}</p>

          <!-- Reference gets the route-board treatment: cream panel, mono figures. -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr>
              <td style="background:#f7f4ef;border:1px solid #e6e0d7;border-radius:9px;padding:16px 20px;">
                <p style="margin:0 0 4px;color:#9c948c;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.09em;">Your reference</p>
                <p style="margin:0;color:#1c1a19;font-size:22px;font-weight:700;letter-spacing:0.02em;font-family:${MONO_FONT};">${esc(opts.booking.referenceCode)}</p>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${rows}
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
            <tr>
              ${payButton}
              <td style="${opts.payUrl ? "border:1px solid #e6e0d7;" : "background:#eba43c;"}border-radius:9px;">
                <a href="${esc(link)}"
                   style="display:inline-block;padding:${opts.payUrl ? "12px 25px" : "13px 26px"};color:#1c1a19;font-size:14px;font-weight:600;text-decoration:none;">
                  ${esc(opts.ctaLabel)}
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:26px 0 0;padding-top:22px;border-top:1px solid #e6e0d7;color:#9c948c;font-size:13px;line-height:1.6;">${esc(opts.footer)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 28px;color:#9c948c;font-size:12px;text-align:center;">
          Keep reference ${esc(opts.booking.referenceCode)} to track this booking.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Plain-text alternative. Required: a text/plain part measurably helps deliverability. */
function plain(opts: {
  heading: string;
  intro: string;
  payUrl?: string;
  booking: BookingEmailData;
  footer: string;
}): string {
  const rows = detailRows(opts.booking)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");

  return [
    opts.heading,
    "",
    opts.intro,
    "",
    // The HTML puts the reference in its own panel; plain text has no such
    // structure, so it goes back at the top of the detail list.
    `Reference: ${opts.booking.referenceCode}`,
    rows,
    "",
    ...(opts.payUrl ? [`Pay for this booking: ${opts.payUrl}`, ""] : []),
    `Track your booking: ${trackingUrl(opts.booking.referenceCode)}`,
    "",
    opts.footer,
  ].join("\n");
}

/** Sent immediately on submission (docs Section 3, step 2). */
export function bookingRequestReceived(booking: BookingEmailData): EmailMessage {
  const heading = "Booking request received";
  const intro =
    `Thanks ${booking.customerName} — we have your trip details. ` +
    `Our team will message you on WhatsApp shortly to confirm availability and the final fare.`;
  const footer =
    "This is a booking request, not a confirmation. Fares shown are estimates and may change once we confirm the details with you.";

  return {
    to: booking.customerEmail,
    subject: `Booking request received — ${booking.referenceCode}`,
    html: layout({ heading, intro, booking, ctaLabel: "Track your booking", footer }),
    text: plain({ heading, intro, booking, footer }),
  };
}

/** Sent when an admin confirms the booking (docs Section 2). */
export function bookingConfirmed(
  booking: BookingEmailData,
  payUrl?: string,
): EmailMessage {
  const heading = "Your booking is confirmed";
  const intro =
    `Good news ${booking.customerName} — your ride is confirmed. ` +
    (payUrl
      ? "You chose to pay by card, so the secure payment link is below. "
      : "") +
    `We're allocating a driver and their details will appear on your tracking page once assigned.`;
  const footer = payUrl
    ? "Payment is handled by Stripe — we never see your card details. Need to change something? Reply to this email or message us on WhatsApp."
    : "Need to change something? Reply to this email or message us on WhatsApp.";

  return {
    to: booking.customerEmail,
    subject: `Booking confirmed — ${booking.referenceCode}`,
    html: layout({ heading, intro, booking, ctaLabel: "View your booking", footer, payUrl }),
    text: plain({ heading, intro, booking, footer, payUrl }),
  };
}
