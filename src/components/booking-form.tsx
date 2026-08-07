"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  formatDistance,
  formatDuration,
  formatFare,
  formatPickup,
} from "@/lib/format";
import type { ServiceType, VehicleCategory } from "@/db/schema";

type Tab = { id: ServiceType; label: string };

const TABS: Tab[] = [
  { id: "ride", label: "Rides" },
  { id: "hourly", label: "Book Hourly" },
  { id: "city_tour", label: "City Tour" },
  { id: "airport", label: "Airport" },
];

const VEHICLES: { id: VehicleCategory; label: string; from: number; glyph: string }[] = [
  { id: "comfort", label: "Comfort", from: 45, glyph: "🚗" },
  { id: "business", label: "Business", from: 85, glyph: "🚙" },
  { id: "suv", label: "SUV", from: 120, glyph: "🚐" },
  { id: "vip", label: "VIP", from: 220, glyph: "🏎️" },
  { id: "van", label: "Van", from: 110, glyph: "🚌" },
];

type FieldErrors = Record<string, string>;

export function BookingForm() {
  const router = useRouter();
  const params = useSearchParams();

  // Prefilled from the hero widget on the homepage, which collects the first
  // few fields before handing off here.
  const [serviceType, setServiceType] = useState<ServiceType>(
    (params.get("serviceType") as ServiceType | null) ?? "ride",
  );
  const [pickupLocation, setPickupLocation] = useState(params.get("pickup") ?? "");
  const [dropoffLocation, setDropoffLocation] = useState(params.get("dropoff") ?? "");
  const [pickupDate, setPickupDate] = useState(params.get("date") ?? "");
  const [pickupTime, setPickupTime] = useState(params.get("time") ?? "");
  const [durationHours, setDurationHours] = useState("2");
  const [flightNumber, setFlightNumber] = useState("");
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>("business");
  const [passengerCount, setPassengerCount] = useState("2");
  const [luggageCount, setLuggageCount] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState(
    params.get("whatsapp") ?? "",
  );
  const [customerEmail, setCustomerEmail] = useState("");

  const [quote, setQuote] = useState<{
    distanceKm: number | null;
    durationMin: number | null;
    fareEstimate: number;
    currency: string;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const isHourly = serviceType === "hourly";
  const isAirport = serviceType === "airport";

  const pickupDatetime =
    pickupDate && pickupTime ? `${pickupDate}T${pickupTime}:00` : "";

  /**
   * Debounced live quote.
   *
   * Each miss costs a billed Routes API element, so this waits for the customer
   * to stop typing rather than firing on every keystroke.
   */
  const quoteAbort = useRef<AbortController | null>(null);

  const quoteReady = isHourly
    ? pickupLocation.trim().length > 2 && Number(durationHours) > 0
    : pickupLocation.trim().length > 2 && dropoffLocation.trim().length > 2;

  // Derived rather than cleared via setState in the effect: resetting state
  // inside an effect body triggers a second render pass for no benefit.
  const shownQuote = quoteReady ? quote : null;
  const shownQuoteError = quoteReady ? quoteError : null;

  useEffect(() => {
    if (!quoteReady) return;

    const timer = setTimeout(async () => {
      quoteAbort.current?.abort();
      const controller = new AbortController();
      quoteAbort.current = controller;

      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            serviceType,
            vehicleCategory,
            pickupLocation,
            dropoffLocation: isHourly ? undefined : dropoffLocation,
            durationHours: isHourly ? Number(durationHours) : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setQuote(null);
          setQuoteError(data.error ?? "Could not calculate a fare");
          return;
        }
        setQuote(data);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setQuote(null);
          setQuoteError("Could not calculate a fare right now");
        }
      } finally {
        setQuoteLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [
    quoteReady,
    serviceType,
    vehicleCategory,
    pickupLocation,
    dropoffLocation,
    durationHours,
    isHourly,
  ]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType,
          pickupLocation,
          dropoffLocation: isHourly ? undefined : dropoffLocation,
          pickupDatetime,
          durationHours: isHourly ? Number(durationHours) : undefined,
          flightNumber: isAirport && flightNumber ? flightNumber : undefined,
          vehicleCategory,
          passengerCount: Number(passengerCount),
          luggageCount: Number(luggageCount),
          customerName,
          customerWhatsapp,
          customerEmail: customerEmail || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (Array.isArray(data.issues)) {
          const errors: FieldErrors = {};
          for (const issue of data.issues) {
            const key = issue.path?.[0];
            if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
          }
          setFieldErrors(errors);
          setFormError("Please check the highlighted fields.");
        } else {
          setFormError(data.error ?? "Could not submit your booking.");
        }
        return;
      }

      router.push(`/track/${data.referenceCode}?new=1`);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
    <form onSubmit={handleSubmit} noValidate>
      <div role="tablist" aria-label="Service type" className="flex flex-wrap gap-2 mb-7">
        {TABS.map((tab) => {
          const active = tab.id === serviceType;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setServiceType(tab.id)}
              className={`rounded-full px-5 py-2.5 text-sm font-medium
                transition-[background-color,color,border-color,transform] duration-200
                ease-out-soft
                hover:-translate-y-0.5 active:translate-y-0 ${
                active
                  ? "bg-ink text-ink-inverse"
                  : "bg-surface text-ink-muted border border-line hover:border-ink-faint"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <section className="card mb-4">
        <h2 className="text-base font-semibold mb-4">Trip Details</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label={isHourly ? "Pickup Location" : "From"}
            id="pickupLocation"
            value={pickupLocation}
            onChange={setPickupLocation}
            placeholder="Dubai International Airport (DXB)"
            error={fieldErrors.pickupLocation}
            required
          />

          {!isHourly && (
            <Field
              label="To"
              id="dropoffLocation"
              value={dropoffLocation}
              onChange={setDropoffLocation}
              placeholder="Burj Khalifa, Downtown Dubai"
              error={fieldErrors.dropoffLocation}
              required
            />
          )}

          {isHourly && (
            <div>
              <label className="field-label" htmlFor="durationHours">
                Duration (hours)
              </label>
              <select
                id="durationHours"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="field-input"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>
                    {h} {h === 1 ? "hour" : "hours"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="field-label" htmlFor="pickupDate">
              Pickup Date
            </label>
            <input
              id="pickupDate"
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="field-input"
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="pickupTime">
              Pickup Time
            </label>
            <input
              id="pickupTime"
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="field-input"
              required
            />
            {fieldErrors.pickupDatetime && (
              <FieldError>{fieldErrors.pickupDatetime}</FieldError>
            )}
          </div>

          {isAirport && (
            <Field
              label="Flight Number"
              id="flightNumber"
              value={flightNumber}
              onChange={setFlightNumber}
              placeholder="EK202"
              error={fieldErrors.flightNumber}
            />
          )}
        </div>
      </section>

      <section className="card mb-4">
        <h2 className="text-base font-semibold mb-4">Choose Vehicle</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {VEHICLES.map((vehicle) => {
            const active = vehicle.id === vehicleCategory;
            return (
              <button
                key={vehicle.id}
                type="button"
                aria-pressed={active}
                onClick={() => setVehicleCategory(vehicle.id)}
                className={`rounded-field border px-3 py-4 text-center
                  transition-[background-color,border-color,transform,box-shadow] duration-200
                  ease-out-soft
                  hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${
                  active
                    ? "border-accent bg-accent-soft shadow-[var(--shadow-lift)]"
                    : "border-line bg-surface hover:border-accent/60 hover:shadow-[var(--shadow-lift)]"
                }`}
              >
                <span className="block text-xl mb-1.5" aria-hidden>
                  {vehicle.glyph}
                </span>
                <span className="block text-sm font-semibold">{vehicle.label}</span>
                <span className="block text-[11px] text-ink-faint mt-0.5">
                  From {formatFare(vehicle.from)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="text-base font-semibold mb-4">Passenger Details</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="passengerCount">
              Passengers
            </label>
            <input
              id="passengerCount"
              type="number"
              min={1}
              max={20}
              value={passengerCount}
              onChange={(e) => setPassengerCount(e.target.value)}
              className="field-input"
              required
            />
            {fieldErrors.passengerCount && (
              <FieldError>{fieldErrors.passengerCount}</FieldError>
            )}
          </div>

          <div>
            <label className="field-label" htmlFor="luggageCount">
              Luggage
            </label>
            <input
              id="luggageCount"
              type="number"
              min={0}
              max={20}
              value={luggageCount}
              onChange={(e) => setLuggageCount(e.target.value)}
              className="field-input"
            />
          </div>

          <Field
            label="Full Name"
            id="customerName"
            value={customerName}
            onChange={setCustomerName}
            placeholder="Your name"
            error={fieldErrors.customerName}
            required
          />

          <Field
            label="WhatsApp Number"
            id="customerWhatsapp"
            value={customerWhatsapp}
            onChange={setCustomerWhatsapp}
            placeholder="+971 5X XXX XXXX"
            error={fieldErrors.customerWhatsapp}
            required
          />

          <div className="sm:col-span-2">
            <Field
              label="Email (optional)"
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={setCustomerEmail}
              placeholder="you@example.com"
              error={fieldErrors.customerEmail}
            />
            <p className="mt-1.5 text-xs text-ink-faint">
              We&apos;ll send your booking reference here. Without it, we&apos;ll
              confirm over WhatsApp only.
            </p>
          </div>
        </div>
      </section>

      {formError && (
        <p
          role="alert"
          className="mb-4 rounded-field border border-red-200 bg-red-50
                     px-4 py-3 text-sm text-red-700"
        >
          {formError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {shownQuote && !quoteLoading && (
          <p className="mr-auto text-sm text-ink-muted">
            Estimated fare{" "}
            <strong className="text-ink">
              {formatFare(shownQuote.fareEstimate, shownQuote.currency)}
            </strong>
          </p>
        )}
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Submitting…" : "Confirm Booking →"}
        </button>
      </div>

      <p className="mt-4 text-xs text-ink-faint">
        Submitting sends a booking request. We&apos;ll confirm availability and
        the final fare over WhatsApp before your ride is assigned.
      </p>
    </form>

      <TripSummary
        from={pickupLocation}
        to={isHourly ? undefined : dropoffLocation}
        pickupLabel={pickupDatetime ? formatPickup(pickupDatetime) : undefined}
        vehicleLabel={VEHICLES.find((v) => v.id === vehicleCategory)?.label}
        quote={shownQuote}
        loading={quoteLoading}
        error={shownQuoteError}
      />
    </div>
  );
}

/**
 * Running trip summary. Carries over the live-fare behaviour the Split Dock
 * held in docs Section 13.2, as a sticky card beside the form.
 */
function AnimatedFare({
  amount,
  currency,
  loading,
}: {
  amount: number | null;
  currency: string;
  loading: boolean;
}) {
  // Re-keying on the value restarts the animation, so a recalculated fare
  // visibly changes rather than silently swapping.
  return (
    <span
      key={amount ?? "none"}
      className={amount != null ? "animate-pop inline-block" : "inline-block"}
    >
      {loading ? "…" : amount != null ? formatFare(amount, currency) : "—"}
    </span>
  );
}

function TripSummary({
  from,
  to,
  pickupLabel,
  vehicleLabel,
  quote,
  loading,
  error,
}: {
  from?: string;
  to?: string;
  pickupLabel?: string;
  vehicleLabel?: string;
  quote: {
    distanceKm: number | null;
    durationMin: number | null;
    fareEstimate: number;
    currency: string;
  } | null;
  loading: boolean;
  error: string | null;
}) {
  const trip = [
    quote?.distanceKm != null ? formatDistance(quote.distanceKm) : null,
    quote?.durationMin != null ? formatDuration(quote.durationMin) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <aside className="animate-rise lg:sticky lg:top-6 rounded-card bg-dock text-ink-inverse p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.06em] mb-4">
        Trip summary
      </h2>

      <dl className="text-sm">
        <SummaryRow label="From" value={from} />
        <SummaryRow label="To" value={to} />
        <SummaryRow label="Pickup" value={pickupLabel} />
        <SummaryRow label="Vehicle" value={vehicleLabel} />
        <SummaryRow label="Trip" value={trip || undefined} />

        <div className="mt-4 pt-4 border-t border-dock-border flex items-baseline justify-between">
          <dt className="text-ink-inverse/55">Estimated</dt>
          <dd className="text-xl font-bold text-accent">
            <AnimatedFare
              amount={quote?.fareEstimate ?? null}
              currency={quote?.currency ?? "AED"}
              loading={loading}
            />
          </dd>
        </div>
      </dl>

      {error && <p className="mt-3 text-xs text-ink-inverse/55 leading-snug">{error}</p>}

      {!quote && !loading && !error && (
        <p className="mt-3 text-xs text-ink-inverse/55 leading-snug">
          Enter your route to see an estimated fare.
        </p>
      )}
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-ink-inverse/55 shrink-0">{label}</dt>
      <dd className="text-right font-medium truncate">{value}</dd>
    </div>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  required,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="field-input"
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

function FieldError({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p id={id} className="mt-1.5 text-xs text-red-600">
      {children}
    </p>
  );
}
