"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  formatDistance,
  formatDuration,
  formatFare,
  formatPickup,
} from "@/lib/format";
import type { PaymentMethod, ServiceType, VehicleCategory } from "@/db/schema";
import type { AllCategoriesQuote } from "@/lib/quote";
import { VEHICLE_SPECS, smallestFitting, vehicleSpec } from "@/lib/vehicles";
import { PlaceInput } from "./place-input";

type Tab = { id: ServiceType; label: string };

const TABS: Tab[] = [
  { id: "ride", label: "Rides" },
  { id: "hourly", label: "Book Hourly" },
  { id: "city_tour", label: "City Tour" },
  { id: "airport", label: "Airport" },
];

type FieldErrors = Record<string, string>;

/**
 * The booking runs as four screens, not one long form.
 *
 * `trip` is the entry state and is not a numbered step: the dock and the
 * homepage widget already collect a route, so most arrivals skip it and land
 * on `vehicle`. Numbering it would show every one of those customers a
 * completed step they never saw.
 *
 * The step lives in the URL so Back works and a half-finished booking survives
 * a refresh. The route travels with it; the customer's name and number do not
 * — those stay in memory, because a phone number does not belong in a URL, in
 * browser history, or in a link someone pastes into a chat.
 */
const STEP_ORDER = ["trip", "vehicle", "details", "payment"] as const;
type Step = (typeof STEP_ORDER)[number];

const NUMBERED_STEPS: { id: Step; label: string }[] = [
  { id: "vehicle", label: "Vehicle" },
  { id: "details", label: "Details" },
  { id: "payment", label: "Payment" },
];

/**
 * How the customer wants to settle up. Cash is first and is the default: it is
 * how this business already works, and card is the addition.
 *
 * Nothing is charged at this step either way. The booking is a request until
 * an admin confirms the fare, so a card customer is choosing how they will pay
 * later, not paying now — the copy has to say so, or the missing card form
 * reads as a broken page.
 */
const PAYMENT_CHOICES: { id: PaymentMethod; label: string; note: string }[] = [
  { id: "cash", label: "Cash", note: "Pay the driver directly" },
  { id: "card", label: "Card", note: "We send a secure payment link" },
];

export function BookingForm({ cardEnabled = false }: { cardEnabled?: boolean }) {
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
  const [durationHours, setDurationHours] = useState(params.get("duration") ?? "2");
  const [flightNumber, setFlightNumber] = useState("");
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>(
    (params.get("vehicle") as VehicleCategory | null) ?? "business",
  );
  const [passengerCount, setPassengerCount] = useState("2");
  const [luggageCount, setLuggageCount] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState(
    params.get("whatsapp") ?? "",
  );
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const [quotes, setQuotes] = useState<AllCategoriesQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const isHourly = serviceType === "hourly";
  const isAirport = serviceType === "airport";

  const pickupDatetime =
    pickupDate && pickupTime ? `${pickupDate}T${pickupTime}:00` : "";

  const tripComplete =
    pickupLocation.trim().length > 0 &&
    (isHourly || dropoffLocation.trim().length > 0) &&
    pickupDate.length > 0 &&
    pickupTime.length > 0;

  /**
   * Capacity against the chosen car. Caught here as well as on the server so
   * the customer is told at the step where they can still fix it, rather than
   * after pressing Confirm.
   */
  const chosen = vehicleSpec(vehicleCategory);
  const overSeats = chosen ? Number(passengerCount) > chosen.seats : false;
  const overBags = chosen ? Number(luggageCount) > chosen.bags : false;
  const overCapacity = overSeats || overBags;

  const suggestion = overCapacity
    ? smallestFitting(Number(passengerCount), Number(luggageCount))
    : undefined;

  const detailsComplete =
    customerName.trim().length > 0 &&
    customerWhatsapp.trim().length > 0 &&
    !overCapacity;

  /**
   * Derived, never stored. The URL asks for a step and the entered data decides
   * how far that request can be honoured, so opening /book?step=payment cold
   * lands on the first screen that still needs filling in rather than on a
   * confirm button with nothing behind it.
   */
  const requestedStep = (params.get("step") ??
    (tripComplete ? "vehicle" : "trip")) as Step;
  const reachableIndex = !tripComplete ? 0 : !detailsComplete ? 2 : 3;
  const requestedIndex = STEP_ORDER.indexOf(requestedStep);
  const step =
    STEP_ORDER[Math.min(requestedIndex < 0 ? 0 : requestedIndex, reachableIndex)];

  function goTo(next: Step) {
    const query = new URLSearchParams(params.toString());
    query.set("step", next);

    // The route rides in the URL so a refresh mid-flow keeps it.
    query.set("serviceType", serviceType);
    query.set("pickup", pickupLocation);
    query.set("vehicle", vehicleCategory);
    if (pickupDate) query.set("date", pickupDate);
    if (pickupTime) query.set("time", pickupTime);

    if (isHourly) {
      query.set("duration", durationHours);
      query.delete("dropoff");
    } else {
      query.delete("duration");
      if (dropoffLocation) query.set("dropoff", dropoffLocation);
    }

    router.push(`/book?${query.toString()}`);
  }

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
  const shownQuotes = quoteReady ? quotes : null;
  const shownQuoteError = quoteReady ? quoteError : null;

  // The sidebar wants one fare; the vehicle step wants all of them. Both read
  // from the same response.
  const selectedFare =
    shownQuotes?.vehicles.find((v) => v.category === vehicleCategory) ?? null;

  const shownQuote =
    shownQuotes && selectedFare
      ? {
          distanceKm: shownQuotes.distanceKm,
          durationMin: shownQuotes.durationMin,
          fareEstimate: selectedFare.fareEstimate,
          currency: selectedFare.currency,
        }
      : null;

  useEffect(() => {
    if (!quoteReady) return;

    const timer = setTimeout(async () => {
      quoteAbort.current?.abort();
      const controller = new AbortController();
      quoteAbort.current = controller;

      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const res = await fetch("/api/quote/all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            serviceType,
            pickupLocation,
            dropoffLocation: isHourly ? undefined : dropoffLocation,
            durationHours: isHourly ? Number(durationHours) : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setQuotes(null);
          setQuoteError(data.error ?? "Could not calculate a fare");
          return;
        }
        setQuotes(data);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setQuotes(null);
          setQuoteError("Could not calculate a fare right now");
        }
      } finally {
        setQuoteLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
    // vehicleCategory is deliberately absent: one response prices every tier,
    // so switching cars reads from what we already have instead of paying for
    // another route measurement.
  }, [
    quoteReady,
    serviceType,
    pickupLocation,
    dropoffLocation,
    durationHours,
    isHourly,
  ]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // One <form> across every step, so Enter behaves the same on all of them:
    // it advances, and only commits on the last one.
    if (step !== "payment") {
      goTo(STEP_ORDER[STEP_ORDER.indexOf(step) + 1]);
      return;
    }

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
          paymentMethod,
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
      {step !== "trip" && (
        <BookingSteps current={step} onJump={goTo} reachableIndex={reachableIndex} />
      )}

      {step === "trip" && (
      <>
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
            place
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
              place
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
                {Array.from({ length: 11 }, (_, i) => i + 2).map((h) => (
                  <option key={h} value={h}>
                    {h} hours
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
      </>
      )}

      {step === "vehicle" && (
      <section className="mb-4" aria-labelledby="vehicle-heading">
        <h2 id="vehicle-heading" className="display text-xl mb-1.5">
          Choose your vehicle
        </h2>
        <p className="text-sm text-ink-muted mb-4">
          Fares are for this trip, and include the driver. We confirm the final
          fare with you before the ride is assigned.
        </p>

        {/*
          One row per tier rather than a grid of small cards. Five cards across
          gave each car about 170px, at which a photograph of a saloon and a
          photograph of an executive saloon are the same grey smudge — and the
          difference between them is what the customer is being asked to pay
          for. A row affords a photograph worth showing plus the capacity and
          the fare on one line.
        */}
        <ul className="grid gap-3">
          {VEHICLE_SPECS.map((vehicle) => {
            const active = vehicle.id === vehicleCategory;
            const fare = shownQuotes?.vehicles.find((v) => v.category === vehicle.id);

            return (
              <li key={vehicle.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setVehicleCategory(vehicle.id)}
                  className={`w-full overflow-hidden rounded-card border text-left
                    flex flex-col sm:flex-row
                    transition-[background-color,border-color,box-shadow] duration-200
                    ease-out-soft ${
                      active
                        ? "border-accent bg-accent-soft shadow-[var(--shadow-lift)]"
                        : "border-line bg-surface hover:border-accent/60 hover:shadow-[var(--shadow-lift)]"
                    }`}
                >
                  <span className="relative block h-44 w-full shrink-0 bg-dock sm:h-auto sm:w-56 sm:self-stretch">
                    <Image
                      src={`/images/vehicles/${vehicle.id}.jpg`}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 14rem, 100vw"
                      className="object-cover"
                    />
                  </span>

                  <span className="flex flex-1 flex-col justify-center p-4 sm:p-5">
                    <span className="block text-lg font-semibold">{vehicle.label}</span>
                    <span className="block text-sm text-ink-muted">{vehicle.blurb}</span>

                    <span className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
                      <span>{vehicle.seats} passengers</span>
                      <span>Up to {vehicle.bags} suitcases</span>
                    </span>

                    {vehicle.inclusions && vehicle.inclusions.length > 0 && (
                      <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-muted">
                        {vehicle.inclusions.map((item) => (
                          <span key={item} className="flex items-center gap-1.5">
                            <span className="size-1 rounded-full bg-accent" aria-hidden />
                            {item}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>

                  <span
                    className="flex shrink-0 items-center justify-between gap-3 border-t
                               border-line p-4 sm:w-44 sm:flex-col sm:items-end
                               sm:justify-center sm:border-l sm:border-t-0 sm:p-5"
                  >
                    {/*
                      Falls back to the published from-price while the fare is
                      still being measured, so the row never reads as free.
                    */}
                    <span className="text-right">
                      {fare ? (
                        <span className="block text-xl font-bold">
                          {formatFare(fare.fareEstimate, fare.currency)}
                        </span>
                      ) : (
                        <span className="block text-xl font-bold text-ink-faint">
                          {quoteLoading ? "…" : `From ${formatFare(vehicle.from)}`}
                        </span>
                      )}
                      {fare && (
                        <span className="block text-[11px] text-ink-faint">
                          estimated total
                        </span>
                      )}
                    </span>

                    <span
                      className={`rounded-field px-4 py-2 text-sm font-semibold ${
                        active ? "bg-accent text-ink" : "border border-line"
                      }`}
                    >
                      {active ? "Selected" : "Select"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      )}

      {step === "details" && (
      <section className="card mb-6">
        <h2 className="text-base font-semibold mb-4">Passenger Details</h2>

        {/*
          Says which car, because the capacity limits below only make sense
          against it — and offers the fix rather than only the complaint. The
          suggestion is a button: telling someone they need a bigger car and
          making them walk back a step to get one is a needless obstacle.
        */}
        {overCapacity && chosen && (
          <div
            role="alert"
            className="mb-4 rounded-field border border-amber-300 bg-amber-50 px-4 py-3 text-sm"
          >
            <p className="text-amber-900">
              {overSeats
                ? `${chosen.label} seats ${chosen.seats}.`
                : `${chosen.label} takes ${chosen.bags} suitcases.`}{" "}
              {suggestion
                ? `${suggestion.label} fits ${passengerCount} passengers and ${luggageCount} suitcases.`
                : "No single vehicle fits this party — message us and we'll arrange two cars."}
            </p>
            {suggestion && (
              <button
                type="button"
                onClick={() => setVehicleCategory(suggestion.id)}
                className="mt-2 font-semibold text-amber-900 underline underline-offset-2"
              >
                Switch to {suggestion.label}
              </button>
            )}
          </div>
        )}

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
            {fieldErrors.passengerCount ? (
              <FieldError>{fieldErrors.passengerCount}</FieldError>
            ) : (
              chosen && (
                <p
                  className={`mt-1.5 text-xs ${
                    overSeats ? "text-amber-700" : "text-ink-faint"
                  }`}
                >
                  {chosen.label} seats {chosen.seats}
                </p>
              )
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
            {fieldErrors.luggageCount ? (
              <FieldError>{fieldErrors.luggageCount}</FieldError>
            ) : (
              chosen && (
                <p
                  className={`mt-1.5 text-xs ${
                    overBags ? "text-amber-700" : "text-ink-faint"
                  }`}
                >
                  Up to {chosen.bags} suitcases
                </p>
              )
            )}
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
      )}

      {step === "payment" && (
        <section className="card mb-4" aria-labelledby="review-heading">
          <h2 id="review-heading" className="text-base font-semibold mb-4">
            Review your booking
          </h2>

          {/*
            A last look before committing. The steps behind this one are each a
            click away in the rail, so the review states what was chosen rather
            than repeating the controls for changing it.
          */}
          <dl className="text-sm">
            <ReviewRow label="Service" value={TABS.find((t) => t.id === serviceType)?.label} />
            <ReviewRow label="From" value={pickupLocation} />
            <ReviewRow label="To" value={isHourly ? undefined : dropoffLocation} />
            <ReviewRow
              label={isHourly ? "Booked for" : "Pickup"}
              value={
                isHourly
                  ? `${durationHours} hours from ${pickupDatetime ? formatPickup(pickupDatetime) : ""}`
                  : pickupDatetime
                    ? formatPickup(pickupDatetime)
                    : undefined
              }
            />
            <ReviewRow label="Vehicle" value={chosen?.label} />
            <ReviewRow
              label="Party"
              value={`${passengerCount} passengers · ${luggageCount} suitcases`}
            />
            <ReviewRow label="Name" value={customerName} />
            <ReviewRow label="WhatsApp" value={customerWhatsapp} />
            <ReviewRow label="Email" value={customerEmail || undefined} />

            <div className="mt-3 pt-3 border-t border-line flex items-baseline justify-between">
              <dt className="font-semibold">Estimated fare</dt>
              <dd className="text-xl font-bold">
                {shownQuote
                  ? formatFare(shownQuote.fareEstimate, shownQuote.currency)
                  : "To be confirmed"}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {/*
        The card option is hidden entirely when Stripe is not configured,
        rather than shown and disabled: offering card and then failing at the
        link stage is worse than never offering it. The section itself still
        renders, because a payment step that says nothing about how to pay
        reads as unfinished.
      */}
      {step === "payment" && (
        <section className="mb-8" aria-labelledby="payment-heading">
          <h2 id="payment-heading" className="display text-xl mb-1.5">
            {cardEnabled ? "How would you like to pay?" : "Payment"}
          </h2>
          <p className="text-sm text-ink-muted mb-4">
            {cardEnabled
              ? "Nothing is charged now. We confirm the fare with you first."
              : "Pay the driver directly at the end of your ride. Nothing is charged now."}
          </p>

          {cardEnabled && (
          <div role="radiogroup" aria-labelledby="payment-heading" className="grid sm:grid-cols-2 gap-3">
            {PAYMENT_CHOICES.map((choice) => {
              const active = paymentMethod === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPaymentMethod(choice.id)}
                  className={`text-left rounded-card border px-4 py-3.5
                    transition-colors duration-200 ease-out-soft ${
                      active
                        ? "border-accent bg-accent/8"
                        : "border-line hover:bg-surface"
                    }`}
                >
                  <span className="flex items-center gap-2.5 font-semibold">
                    <span
                      aria-hidden
                      className={`size-4 rounded-full border-2 shrink-0 grid place-items-center ${
                        active ? "border-accent" : "border-line"
                      }`}
                    >
                      {active && <span className="size-2 rounded-full bg-accent" />}
                    </span>
                    {choice.label}
                  </span>
                  <span className="mt-1 block text-sm text-ink-muted pl-6.5">
                    {choice.note}
                  </span>
                </button>
              );
            })}
          </div>
          )}
        </section>
      )}

      {formError && (
        <p
          role="alert"
          className="mb-4 rounded-field border border-red-200 bg-red-50
                     px-4 py-3 text-sm text-red-700"
        >
          {formError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {step !== "trip" && (
          <button
            type="button"
            onClick={() => goTo(STEP_ORDER[STEP_ORDER.indexOf(step) - 1])}
            className="btn-secondary"
          >
            ← Back
          </button>
        )}

        {shownQuote && !quoteLoading && (
          <p className="ml-auto text-sm text-ink-muted">
            Estimated fare{" "}
            <strong className="text-ink">
              {formatFare(shownQuote.fareEstimate, shownQuote.currency)}
            </strong>
          </p>
        )}

        {/*
          Disabled rather than hidden while the step is incomplete: a button
          that vanishes leaves the customer looking for what they missed, and a
          disabled one sits where they expect it with the fields still visible
          above. Validation on submit still has the final say.
        */}
        <button
          type="submit"
          disabled={
            submitting ||
            (step === "trip" && !tripComplete) ||
            (step === "details" && !detailsComplete)
          }
          className={`btn-primary ${shownQuote && !quoteLoading ? "" : "ml-auto"}`}
        >
          {step === "payment"
            ? submitting
              ? "Submitting…"
              : "Confirm Booking →"
            : "Continue →"}
        </button>
      </div>

      {step === "payment" && (
        <p className="mt-4 text-xs text-ink-faint">
          Submitting sends a booking request. We&apos;ll confirm availability and
          the final fare over WhatsApp before your ride is assigned.
        </p>
      )}
    </form>

      <TripSummary
        from={pickupLocation}
        to={isHourly ? undefined : dropoffLocation}
        pickupLabel={pickupDatetime ? formatPickup(pickupDatetime) : undefined}
        vehicleLabel={
          step === "trip"
            ? undefined
            : vehicleSpec(vehicleCategory)?.label
        }
        passengers={passengerCount}
        durationHours={isHourly ? durationHours : undefined}
        quote={shownQuote}
        loading={quoteLoading}
        error={shownQuoteError}
      />
    </div>
  );
}

/**
 * The progress rail.
 *
 * A completed step is a link back, not just a marker: the commonest thing a
 * customer wants at the payment step is to change the car, and making them
 * press Back twice to do it is the sort of friction that loses the booking.
 * Steps ahead of the data are inert — there is nothing to show yet.
 */
function BookingSteps({
  current,
  onJump,
  reachableIndex,
}: {
  current: Step;
  onJump: (step: Step) => void;
  reachableIndex: number;
}) {
  const currentIndex = STEP_ORDER.indexOf(current);

  return (
    <ol className="relative flex items-start justify-between mb-8">
      {/* The rail itself, behind the nodes. Inset by half a node so it starts
          and ends at the first and last centres rather than at the edges. */}
      <div
        aria-hidden
        className="absolute left-[12.5%] right-[12.5%] top-2 h-px bg-line"
      />

      {NUMBERED_STEPS.map((s, i) => {
        const index = STEP_ORDER.indexOf(s.id);
        const done = index < currentIndex;
        const active = index === currentIndex;
        const reachable = index <= reachableIndex;

        return (
          <li key={s.id} className="relative flex-1 text-center">
            <button
              type="button"
              onClick={() => reachable && onJump(s.id)}
              disabled={!reachable}
              aria-current={active ? "step" : undefined}
              className="group flex w-full flex-col items-center gap-2
                         disabled:cursor-default"
            >
              <span
                aria-hidden
                className={`grid size-4 place-items-center rounded-full border-2
                  bg-canvas transition-colors duration-200 ${
                    active
                      ? "border-accent"
                      : done
                        ? "border-accent bg-accent"
                        : "border-line"
                  }`}
              >
                {active && <span className="size-1.5 rounded-full bg-accent" />}
              </span>
              <span
                className={`text-sm transition-colors duration-200 ${
                  active
                    ? "font-semibold text-ink"
                    : done
                      ? "text-ink-muted group-hover:text-ink"
                      : "text-ink-faint"
                }`}
              >
                {i + 1}. {s.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
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
  passengers,
  durationHours,
  quote,
  loading,
  error,
}: {
  from?: string;
  to?: string;
  pickupLabel?: string;
  vehicleLabel?: string;
  passengers?: string;
  /** Hourly bookings only — they have hours booked instead of a distance. */
  durationHours?: string;
  quote: {
    distanceKm: number | null;
    durationMin: number | null;
    fareEstimate: number;
    currency: string;
  } | null;
  loading: boolean;
  error: string | null;
}) {
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

        {/*
          Distance and duration on their own rows rather than joined by a dot.
          They answer different questions — "is this the route I meant?" and
          "how long am I in the car?" — and a customer scanning for one of them
          should not have to parse a compound string to find it.
        */}
        <SummaryRow
          label="Distance"
          value={quote?.distanceKm != null ? formatDistance(quote.distanceKm) : undefined}
        />
        <SummaryRow
          label={durationHours ? "Booked for" : "Duration"}
          value={
            durationHours
              ? `${durationHours} hours`
              : quote?.durationMin != null
                ? formatDuration(quote.durationMin)
                : undefined
          }
        />
        <SummaryRow
          label="Passengers"
          value={passengers && passengers !== "0" ? passengers : undefined}
        />

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

function ReviewRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-6 py-1.5 border-b border-line last:border-0">
      <dt className="text-ink-muted shrink-0">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
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
  place = false,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  required?: boolean;
  /** Address fields only — turns the input into a place-suggestion combobox. */
  place?: boolean;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {place ? (
        <PlaceInput
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
        />
      ) : (
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
      )}
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
