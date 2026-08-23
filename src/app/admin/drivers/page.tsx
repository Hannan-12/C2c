import type { Metadata } from "next";
import { asc, count, desc } from "drizzle-orm";
import { db } from "@/db";
import { bookingAssignments, drivers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";
import { whatsappLink } from "@/lib/format";
import { EMIRATES, EMIRATE_LABEL } from "@/lib/emirates";
import {
  createDriver,
  deleteDriver,
  toggleDriverActive,
  updateDriver,
} from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Drivers",
  robots: { index: false, follow: false },
};

export default async function DriversPage() {
  await requireAdmin();

  const list = await db
    .select()
    .from(drivers)
    .orderBy(desc(drivers.active), asc(drivers.name));

  /**
   * How many trips each driver has. A driver with history cannot be deleted —
   * the assignments reference them and the payout figures are calculated
   * through them — so the button is not offered rather than offered and
   * refused.
   */
  const tripCounts = await db
    .select({ driverId: bookingAssignments.driverId, trips: count() })
    .from(bookingAssignments)
    .groupBy(bookingAssignments.driverId);

  const trips = new Map(tripCounts.map((t) => [t.driverId, t.trips]));

  return (
    <>
      <h1 className="display text-2xl sm:text-3xl mb-1">Drivers</h1>
      <p className="text-ink-muted mb-6 max-w-2xl">
        Only active drivers appear when assigning a booking, with the booking&apos;s
        own emirate listed first. Being based somewhere is not a restriction —
        an airport run routinely ends in another emirate.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {EMIRATES.map((e) => {
          const n = list.filter((d) => d.city === e && d.active).length;
          return (
            <span
              key={e}
              className="rounded-full border border-line bg-field px-3 py-1.5 text-xs"
            >
              {EMIRATE_LABEL[e]}{" "}
              <span className="tnum font-mono font-semibold">{n}</span>
            </span>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        {list.length === 0 ? (
          <div className="card text-center py-12">
            <p className="font-semibold mb-1">No drivers yet</p>
            <p className="text-sm text-ink-muted">
              Add your first driver so bookings can be assigned.
            </p>
          </div>
        ) : (
          <div className="card !p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-130">
              <caption className="sr-only">Drivers</caption>
              <thead>
                <tr className="sr-only">
                  <th scope="col">Driver</th>
                </tr>
              </thead>
              <tbody>
                {list.map((driver) => (
                  <tr
                    key={driver.id}
                    className="border-b border-line last:border-0 hover:bg-field/60"
                  >
                    {/*
                      Editable in place. A mistyped number used to be permanent,
                      and the workaround — a second driver with the same name —
                      split their trips and their payout across two records.
                    */}
                    <td colSpan={4} className="px-5 py-3.5">
                      <form
                        action={updateDriver}
                        className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_1fr_auto] sm:items-end"
                      >
                        <input type="hidden" name="driverId" value={driver.id} />

                        <div>
                          <label className="field-label" htmlFor={`name-${driver.id}`}>
                            Name
                          </label>
                          <input
                            id={`name-${driver.id}`}
                            name="name"
                            required
                            defaultValue={driver.name}
                            className="field-input"
                          />
                        </div>

                        <div>
                          <label className="field-label" htmlFor={`wa-${driver.id}`}>
                            WhatsApp
                          </label>
                          <input
                            id={`wa-${driver.id}`}
                            name="whatsappNumber"
                            required
                            defaultValue={driver.whatsappNumber}
                            className="field-input font-mono text-[13px]"
                          />
                        </div>

                        <div>
                          <label className="field-label" htmlFor={`city-${driver.id}`}>
                            Based in
                          </label>
                          <select
                            id={`city-${driver.id}`}
                            name="city"
                            defaultValue={driver.city}
                            className="field-input"
                          >
                            {EMIRATES.map((e) => (
                              <option key={e} value={e}>
                                {EMIRATE_LABEL[e]}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="field-label" htmlFor={`veh-${driver.id}`}>
                            Vehicle
                          </label>
                          <input
                            id={`veh-${driver.id}`}
                            name="vehicleAssigned"
                            defaultValue={driver.vehicleAssigned ?? ""}
                            placeholder="Optional"
                            className="field-input"
                          />
                        </div>

                        <button type="submit" className="btn-secondary sm:mb-0">
                          Save
                        </button>
                      </form>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-ink-faint">
                          {trips.get(driver.id) ?? 0} trips
                        </span>

                        <a
                          href={whatsappLink(
                            driver.whatsappNumber,
                            `Hi ${driver.name}, are you available for a job?`,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-whatsapp hover:underline"
                        >
                          Message
                        </a>

                        <form action={toggleDriverActive} className="inline">
                          <input type="hidden" name="driverId" value={driver.id} />
                          <input
                            type="hidden"
                            name="active"
                            value={driver.active ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                              driver.active
                                ? "border-accent bg-accent-soft text-accent-strong hover:bg-accent/20"
                                : "border-line bg-field text-ink-faint hover:border-ink-faint"
                            }`}
                          >
                            {driver.active ? "Active" : "Inactive"}
                          </button>
                        </form>

                        {/*
                          Only for a driver who never drove. Anyone with trips
                          behind them is deactivated instead, so the record of
                          who drove those trips survives.
                        */}
                        {(trips.get(driver.id) ?? 0) === 0 && (
                          <form action={deleteDriver} className="inline">
                            <input type="hidden" name="driverId" value={driver.id} />
                            <button
                              type="submit"
                              className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1
                                         text-[11px] font-semibold text-red-700 hover:bg-red-100
                                         transition-colors"
                            >
                              Remove
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form action={createDriver} className="card lg:sticky lg:top-6">
          <h2 className="font-semibold mb-4">Add a driver</h2>

          <div className="mb-3.5">
            <label className="field-label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" required className="field-input" />
          </div>

          <div className="mb-3.5">
            <label className="field-label" htmlFor="whatsappNumber">
              WhatsApp number
            </label>
            <input
              id="whatsappNumber"
              name="whatsappNumber"
              required
              placeholder="971501234567"
              className="field-input"
            />
            <p className="mt-1.5 text-xs text-ink-faint">
              International format, no plus sign.
            </p>
          </div>

          <div className="mb-3.5">
            <label className="field-label" htmlFor="city">
              Based in
            </label>
            <select id="city" name="city" defaultValue="dubai" className="field-input">
              {EMIRATES.map((e) => (
                <option key={e} value={e}>
                  {EMIRATE_LABEL[e]}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-ink-faint">
              Decides which jobs they are offered first. Not a restriction —
              anyone can be assigned any trip.
            </p>
          </div>

          <div className="mb-4">
            <label className="field-label" htmlFor="vehicleAssigned">
              Vehicle (optional)
            </label>
            <input
              id="vehicleAssigned"
              name="vehicleAssigned"
              placeholder="Mercedes E-Class"
              className="field-input"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Add driver
          </button>
        </form>
      </div>
    </>
  );
}
