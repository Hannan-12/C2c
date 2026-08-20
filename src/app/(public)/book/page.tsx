import Link from "next/link";
import { Suspense } from "react";
import { BookingForm } from "@/components/booking-form";
import { paymentsEnabled } from "@/lib/payments/stripe";
import { TrustBar } from "@/components/trust-bar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Book a Ride",
  description:
    "Book a chauffeur, airport transfer, city tour or hourly car in Dubai, Abu Dhabi or Sharjah. Instant fare estimate, confirmation over WhatsApp.",
  path: "/book",
});

export default function BookPage() {
  return (
    <div className="px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-faint mb-4">
        <Link href="/" className="hover:text-ink-muted">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink font-medium">Book a Ride</span>
      </nav>

      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
        Complete your booking
      </h1>
      <p className="text-ink-muted mb-8">
        Fill in your trip details — we&apos;ll confirm availability over WhatsApp
        within minutes.
      </p>

      {/* Outside the boundary: nothing here suspends, so it should paint with
          the page rather than behind the form's loading fallback. */}
      <TrustBar />

      <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
        {/* Server-side check: the Stripe key must never reach the browser. */}
        <BookingForm cardEnabled={paymentsEnabled()} />
      </Suspense>
    </div>
  );
}
