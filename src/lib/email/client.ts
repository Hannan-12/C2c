/**
 * Resend transactional email client (docs Section 7).
 *
 * Calls the HTTPS API directly rather than adding the `resend` SDK: we send
 * two fixed templates from the server, so the SDK would be a dependency
 * earning nothing. Mirrors the approach in routes-api.ts.
 */

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
 * Sends an email, or logs it when no API key is configured.
 *
 * The client's Resend account and verified sending domain are a handover item
 * (docs Section 15), so the whole booking flow has to work before a key
 * exists. Without one this logs and reports `skipped` instead of throwing —
 * the same escape hatch GOOGLE_ROUTES_MOCK gives the quote engine.
 */
export async function sendEmail(
  message: EmailMessage,
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_EMAIL_FROM;

  if (!apiKey || !from) {
    console.info(
      `[email] Not configured (RESEND_API_KEY / BOOKING_EMAIL_FROM) — ` +
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
