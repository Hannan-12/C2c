"use client";

import { useState } from "react";

/**
 * Fetches a fresh Checkout link, then hands the browser to Stripe.
 *
 * The link is minted on click rather than rendered into the page. A Checkout
 * session expires, and one baked into a tracking page that a customer leaves
 * open — or bookmarks — would be dead by the time they used it. Asking at the
 * moment of intent also means a fare revised since the confirmation email is
 * the fare charged.
 */
export function PayButton({ reference }: { reference: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/bookings/${encodeURIComponent(reference)}/pay`,
        { method: "POST" },
      );
      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start the payment.");
        return;
      }

      // Same tab: Stripe returns to our success URL, and a popup blocked by
      // the browser would look like a broken button.
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      // Left busy on success — the navigation is already under way, and
      // re-enabling invites a second click that starts another session.
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={pay} disabled={busy} className="btn-primary w-full">
        {busy ? "Opening secure checkout…" : "Pay now"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </>
  );
}
