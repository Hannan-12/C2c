import type { Metadata } from "next";
import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookingAssignments, drivers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";
import { whatsappLink } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EMIRATES, EMIRATE_LABEL, EMIRATE_SLUG, emirateFromSlug } from "@/lib/emirates";
import {
  createDriver,
  deleteDriver,
  toggleDriverActive,
  updateDriver,
} from "../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Drivers",
  robots: { index: false, follow: false },
};

export default async function DriversPage({ params }: PageProps<"/admin/drivers/[city]">) {
  await requireAdmin();

  const { city: slug } = await params;
  const city = emirateFromSlug(slug);
  if (!city) notFound();

  const list = await db
    .select()
    .from(drivers)
    .where(eq(drivers.city, city))
    .orderBy(desc(drivers.active), asc(drivers.name));

  /**
   * Counts for the other emirates, so the tabs say how many are behind them.
   * One grouped query rather than three page loads — the number is the reason
   * to click, and a tab that only reveals its count once opened is no use for
   * deciding where to look.
   */
  const counts = await db
    .select({ city: drivers.city, total: count() })
    .from(drivers)
    .where(eq(drivers.active, true))
    .groupBy(drivers.city);

  const countFor = new Map(counts.map((c) => [c.city, c.total]));

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
      <h1 className="display text-2xl sm:text-3xl mb-1">
        {EMIRATE_LABEL[city]} drivers
      </h1>
      <p className="text-ink-muted mb-5 max-w-2xl">
        Each emirate keeps its own list. A booking is only ever offered to the
        drivers based where the customer is picked up.
      </p>

      {/*
        Real pages rather than a filter, so a city's list can be bookmarked and
        left open — which is how it gets used when the phone is ringing.
      */}
      <nav aria-label="Emirate" className="mb-6 flex flex-wrap gap-2">
        {EMIRATES.map((e) => (
          <Link
            key={e}
            href={`/admin/drivers/${EMIRATE_SLUG[e]}`}
            aria-current={e === city ? "page" : undefined}
            className={`rounded-field border px-3.5 py-2 text-sm transition-colors ${
              e === city
                ? "border-accent bg-accent-soft font-semibold text-accent-strong"
                : "border-line hover:bg-field"
            }`}
          >
            {EMIRATE_LABEL[e]}{" "}
            <span className="tnum font-mono text-xs opacity-70">
              {countFor.get(e) ?? 0}
            </span>
          </Link>
        ))}
      </nav>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        {list.length === 0 ? (
          <div className="card text-center py-12">
            <p className="font-semibold mb-1">No drivers in {EMIRATE_LABEL[city]}</p>
            <p className="text-sm text-ink-muted">
              Bookings picked up here cannot be assigned until someone is added.
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
          <h2 className="font-semibold mb-4">Add a {EMIRATE_LABEL[city]} driver</h2>

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
            <select id="city" name="city" defaultValue={city} className="field-input">
              {EMIRATES.map((e) => (
                <option key={e} value={e}>
                  {EMIRATE_LABEL[e]}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-ink-faint">
              Decides which bookings they can be assigned. Choose another
              emirate to add them to that list instead.
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
