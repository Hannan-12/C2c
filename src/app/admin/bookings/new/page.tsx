import type { Metadata } from "next";
import Link from "next/link";
import { SERVICE_TYPES, PAYMENT_METHODS } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";
import { SERVICE_LABEL } from "@/lib/booking-status";
import { VEHICLE_SPECS } from "@/lib/vehicles";
import { HOURLY_MINIMUM } from "@/lib/service-terms";
import { createPhoneBooking } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New booking",
  robots: { index: false, follow: false },
};

export default async function NewBookingPage() {
  await requireAdmin();

  /**
   * A slot two hours out, computed on the server so the field is filled the
   * moment the page arrives — an operator with a customer on the phone should
   * not be typing today's date.
   */
  const when = new Date(Date.now() + 2 * 60 * 60 * 1000);
  when.setMinutes(when.getMinutes() > 30 ? 60 : 30, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultWhen = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(
    when.getDate(),
  )}T${pad(when.getHours())}:${pad(when.getMinutes())}`;

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-xs text-ink-faint mb-4">
        <Link href="/admin" className="hover:text-ink-muted">
          Bookings
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink font-medium">New</span>
      </nav>

      <h1 className="display text-2xl sm:text-3xl mb-1">Booking over the phone</h1>
      <p className="text-ink-muted mb-6 max-w-2xl">
        Arrives already confirmed — you have the customer on the line, so there
        is nobody left to confirm it with. They get the same confirmation email,
        and the same payment link if they are paying by card.
      </p>

      <form action={createPhoneBooking} className="card grid gap-4 sm:grid-cols-2 max-w-3xl">
        <div>
          <label className="field-label" htmlFor="serviceType">
            Service
          </label>
          <select id="serviceType" name="serviceType" className="field-input" defaultValue="ride">
            {SERVICE_TYPES.filter((t) => t !== "courier").map((t) => (
              <option key={t} value={t}>
                {SERVICE_LABEL[t] ?? t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="vehicleCategory">
            Vehicle
          </label>
          <select id="vehicleCategory" name="vehicleCategory" className="field-input">
            {VEHICLE_SPECS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} — {v.seats} seats, {v.bags} bags
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="pickupLocation">
            Pickup
          </label>
          <input
            id="pickupLocation"
            name="pickupLocation"
            required
            className="field-input"
            placeholder="Dubai Mall"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="dropoffLocation">
            Drop-off
          </label>
          <input
            id="dropoffLocation"
            name="dropoffLocation"
            className="field-input"
            placeholder="Leave blank for an hourly booking"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="pickupDatetime">
            Pickup time
          </label>
          <input
            id="pickupDatetime"
            name="pickupDatetime"
            type="datetime-local"
            required
            defaultValue={defaultWhen}
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="durationHours">
            Hours (hourly bookings)
          </label>
          <input
            id="durationHours"
            name="durationHours"
            type="number"
            min={HOURLY_MINIMUM}
            className="field-input"
            placeholder={`${HOURLY_MINIMUM} minimum`}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="passengerCount">
            Passengers
          </label>
          <input
            id="passengerCount"
            name="passengerCount"
            type="number"
            min={1}
            defaultValue={1}
            required
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="luggageCount">
            Bags
          </label>
          <input
            id="luggageCount"
            name="luggageCount"
            type="number"
            min={0}
            defaultValue={0}
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="customerName">
            Customer name
          </label>
          <input id="customerName" name="customerName" required className="field-input" />
        </div>

        <div>
          <label className="field-label" htmlFor="customerWhatsapp">
            WhatsApp number
          </label>
          <input
            id="customerWhatsapp"
            name="customerWhatsapp"
            required
            placeholder="971501234567"
            className="field-input font-mono text-[13px]"
          />
          <span className="mt-1 block text-[11px] text-ink-faint">
            With the country code. Spaces and a plus are fine.
          </span>
        </div>

        <div>
          <label className="field-label" htmlFor="customerEmail">
            Email
          </label>
          <input
            id="customerEmail"
            name="customerEmail"
            type="email"
            required
            className="field-input"
          />
          <span className="mt-1 block text-[11px] text-ink-faint">
            The confirmation and any payment link go here.
          </span>
        </div>

        <div>
          <label className="field-label" htmlFor="paymentMethod">
            Paying by
          </label>
          <select id="paymentMethod" name="paymentMethod" className="field-input" defaultValue="cash">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m === "cash" ? "Cash to the driver" : "Card — send a payment link"}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="agreedFare">
            Agreed fare
          </label>
          <input
            id="agreedFare"
            name="agreedFare"
            type="number"
            step="0.01"
            min="0.01"
            className="field-input w-48"
            placeholder="Blank to use the quote"
          />
          <span className="mt-1 block text-[11px] text-ink-faint">
            The route is priced automatically. Fill this in only if you agreed a
            different figure — it is what gets charged.
          </span>
        </div>

        <div className="sm:col-span-2 flex gap-2 pt-1">
          <button type="submit" className="btn-primary">
            Create confirmed booking
          </button>
          <Link href="/admin" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
