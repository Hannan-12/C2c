import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { vehiclePricing, VEHICLE_CATEGORIES } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";
import { fareFor } from "@/lib/quote";
import { formatFare } from "@/lib/format";
import { VEHICLE_SPECS } from "@/lib/vehicles";
import { updatePricing } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  robots: { index: false, follow: false },
};

/**
 * A trip to price each row against, so a rate change can be checked before it
 * reaches a customer.
 *
 * Deliberately an ordinary journey rather than a round number: 18 km and 25
 * minutes is roughly the airport into Downtown, which is the trip the business
 * actually sells. A rate that produces a sensible fare for 10 km and a silly
 * one for a real route is a rate that looks fine in a preview and wrong on the
 * site.
 */
const SAMPLE = { distanceKm: 18, durationMin: 25 };
const SAMPLE_HOURS = 3;

const FIELDS = [
  { key: "baseFare", label: "Base", hint: "Flat charge on every trip" },
  { key: "perKm", label: "Per km", hint: "Distance rate" },
  { key: "perMin", label: "Per min", hint: "Time rate" },
  { key: "minimumFare", label: "Minimum", hint: "Floor for short trips" },
  { key: "hourlyRate", label: "Per hour", hint: "Hourly hire and tours" },
] as const;

export default async function PricingPage() {
  await requireAdmin();

  const rows = await db.select().from(vehiclePricing).orderBy(asc(vehiclePricing.category));

  // Ordered by the canonical tier order, not by whatever the table returns, so
  // the rows read cheapest-first the way customers see them.
  const ordered = VEHICLE_CATEGORIES.map((category) => {
    const row = rows.find((r) => r.category === category);
    const spec = VEHICLE_SPECS.find((v) => v.id === category);
    return row ? { row, label: spec?.label ?? category, blurb: spec?.blurb ?? "" } : null;
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <>
      <h1 className="display text-2xl sm:text-3xl mb-1">Pricing</h1>
      <p className="text-ink-muted mb-6 max-w-2xl">
        What every quote on the site is calculated from. Changes apply to new
        quotes straight away — a fare already agreed with a customer does not
        move.
      </p>

      {ordered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="font-semibold mb-1">No pricing rows</p>
          <p className="text-sm text-ink-muted">
            The vehicle_pricing table is empty, so nothing can be quoted. Seed it
            before taking bookings.
          </p>
        </div>
      ) : (
        <form action={updatePricing} className="grid gap-4">
          {ordered.map(({ row, label, blurb }) => (
            <section key={row.category} className="card">
              <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-4">
                <h2 className="font-semibold">
                  {label}
                  <span className="ml-2 text-xs font-normal text-ink-faint">{blurb}</span>
                </h2>

                {/*
                  The same function the quote endpoint uses, not an
                  approximation of it. A preview that computes fares its own
                  way would eventually disagree with the site, and the whole
                  point of showing it is to be trusted.
                */}
                <p className="text-xs text-ink-muted">
                  A {SAMPLE.distanceKm}km · {SAMPLE.durationMin}min trip costs{" "}
                  <span className="tnum font-mono font-semibold text-ink">
                    {formatFare(fareFor(row, { route: SAMPLE }))}
                  </span>
                  <span className="mx-2 text-ink-faint" aria-hidden>
                    ·
                  </span>
                  {SAMPLE_HOURS} hours{" "}
                  <span className="tnum font-mono font-semibold text-ink">
                    {formatFare(fareFor(row, { route: null, durationHours: SAMPLE_HOURS }))}
                  </span>
                </p>
              </header>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {FIELDS.map((field) => (
                  <div key={field.key}>
                    <label
                      className="field-label"
                      htmlFor={`${row.category}.${field.key}`}
                    >
                      {field.label}
                    </label>
                    <input
                      id={`${row.category}.${field.key}`}
                      name={`${row.category}.${field.key}`}
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      required
                      defaultValue={Number(row[field.key])}
                      className="field-input tnum font-mono"
                    />
                    <span className="mt-1 block text-[11px] text-ink-faint">
                      {field.hint}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/*
            One button for the whole list. Rates are set relative to each other
            — Business above Comfort, VIP above both — and a save per row means
            the site briefly quotes a price list nobody intended.
          */}
          <div className="card flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-ink-muted max-w-md">
              Saving updates all {ordered.length} classes together, and the
              figures shown on the site follow within a minute.
            </p>
            <button type="submit" className="btn-primary">
              Save all pricing
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-xs text-ink-faint">
        All figures in {ordered[0]?.row.currency ?? "AED"}. The example above
        uses the same calculation as a real quote, so what it shows is what a
        customer would be told.
      </p>
    </>
  );
}
