import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { normaliseReferenceCode } from "@/lib/reference-code";
import { canonical } from "@/lib/seo";

/**
 * Hand-written rather than built by pageMetadata, and so it never gained a
 * canonical. The lookup form is a real landing page — people search for it —
 * so it needs one; the per-booking pages under /track/[code] do not, and are
 * kept out of the index by robots.txt because they show customer details to
 * anyone holding the link.
 */
export const metadata: Metadata = {
  title: "Track your booking",
  description:
    "Enter your booking reference code to see your ride status and driver details.",
  alternates: { canonical: canonical("/track") },
};

export default async function TrackLookupPage({
  searchParams,
}: PageProps<"/track">) {
  const params = await searchParams;
  const notFound = params.notfound === "1";

  async function lookup(formData: FormData) {
    "use server";
    const raw = String(formData.get("reference") ?? "").trim();
    if (!raw) redirect("/track?notfound=1");
    redirect(`/track/${encodeURIComponent(normaliseReferenceCode(raw))}`);
  }

  return (
    <div className="px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      <div className="max-w-lg">
        <h1 className="animate-rise display text-3xl sm:text-4xl mb-2">Track your booking</h1>
        <p className="text-ink-muted mb-8">
          Enter the reference code from your confirmation message — it looks like{" "}
          <span className="font-mono text-ink">C2C-7K4M2XQP</span>.
        </p>

        <form action={lookup} className="card animate-rise">
          <label className="field-label" htmlFor="reference">
            Booking reference
          </label>
          <input
            id="reference"
            name="reference"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="C2C-7K4M2XQP"
            aria-describedby={notFound ? "reference-error" : undefined}
            className="field-input font-mono uppercase"
          />

          {notFound && (
            <p id="reference-error" role="alert" className="mt-2 text-sm text-red-600">
              We couldn&apos;t find a booking with that reference. Check the code
              and try again.
            </p>
          )}

          <button type="submit" className="btn-primary mt-4 w-full sm:w-auto">
            Find my booking
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-muted">
          Lost your reference code? Message us on WhatsApp using the button in
          the panel and we&apos;ll find your booking.
        </p>
      </div>
    </div>
  );
}
