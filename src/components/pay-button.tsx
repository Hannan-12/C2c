"use client";

import { useState } from "react";

/**
 * Fetches a fresh Checkout link, then opens Stripe in a new tab.
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
    /**
     * The tab is opened here, synchronously, before any awaiting.
     *
     * A browser only allows window.open while it can still see the click that
     * caused it. Opening after the fetch resolves puts it outside that window
     * and every popup blocker stops it — the button would appear to do
     * nothing, which is worse than not offering a new tab at all. So the tab
     * is claimed immediately and pointed at Stripe once the URL arrives.
     */
    const tab = window.open("about:blank", "_blank");

    // Severs the new tab's handle back to this page. Stripe has no reason to
    // reach into the tracking page, and a payment page should not hold a
    // reference to the site that opened it.
    if (tab) tab.opener = null;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/bookings/${encodeURIComponent(reference)}/pay`,
        { method: "POST" },
      );
      const data = await res.json();

      if (!res.ok || !data.url) {
        tab?.close();
        setError(data.error ?? "Could not start the payment.");
        setBusy(false);
        return;
      }

      if (tab) {
        tab.location.href = data.url;
        // This page stays put, so the button has to become usable again —
        // a customer who closes Stripe without paying needs to try again.
        setBusy(false);
      } else {
        /**
         * The popup was blocked. Navigating this tab instead is not a
         * fallback so much as the original behaviour: the customer reaches
         * Stripe either way, which matters more than which tab it lands in.
         * Left busy, because the navigation is already under way.
         */
        window.location.href = data.url;
      }
    } catch {
      tab?.close();
      setError("Network error. Please try again.");
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
      {/*
        Lives with the button rather than on the page, so the promise about
        card details and the fact that a new tab opens cannot drift apart from
        what the button actually does.
      */}
      <p className="mt-2 text-[11px] text-ink-faint">
        Opens in a new tab, handled by Stripe — we never see your card details.
        This page updates once the payment clears.
      </p>
    </>
  );
}
