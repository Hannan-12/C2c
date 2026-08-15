/**
 * Resend transactional email client (docs Section 7).
 *
 * Calls the HTTPS API directly rather than adding the `resend` SDK: we send
 * two fixed templates from the server, so the SDK would be a dependency
 * earning nothing. Mirrors the approach in routes-api.ts.
 */

import { BRAND, BUSINESS } from "@/lib/seo";

const ENDPOINT = "https://api.resend.com/emails";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export class EmailError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "EmailError";
  }
}

/**
 * Sending identity — the business's own contact mailbox, so a customer who
 * replies reaches a real inbox rather than a bounce.
 *
 * `rideonclick.com` is verified in Resend, so this address is a fixed property
 * of the business rather than of the environment — the same in development and
 * production, and not a secret.
 *
 * It lives here rather than in an environment variable because the host's
 * settings panel proved unreliable: an edited value reverted to an earlier one
 * more than once, and while it held `onboarding@resend.dev` every send was
 * rejected 403 (that test domain may only mail the account owner). BOOKING_EMAIL_FROM
 * still overrides, for staging on a different domain.
 */
const DEFAULT_FROM = `${BRAND} <${BUSINESS.email}>`;

/**
 * Sends an email, or logs it when no API key is configured.
 *
 * The key remains an environment variable — it *is* a secret. Without one this
 * logs and reports `skipped` instead of throwing, the same escape hatch
 * GOOGLE_ROUTES_MOCK gives the quote engine, so the booking flow works before
 * the client's Resend account exists (docs Section 15).
 */
export async function sendEmail(
  message: EmailMessage,
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM?.trim() || DEFAULT_FROM;

  if (!apiKey) {
    console.info(
      `[email] Not configured (RESEND_API_KEY) — ` +
        `would send "${message.subject}" to ${message.to}`,
    );
    return { sent: false, reason: "not-configured" };
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new EmailError(
      `Resend rejected the message (${response.status}): ${detail}`,
      response.status,
    );
  }

  return { sent: true };
}
