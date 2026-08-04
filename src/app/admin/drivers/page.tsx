import type { Metadata } from "next";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { drivers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";
import { whatsappLink } from "@/lib/format";
import { createDriver, toggleDriverActive } from "../actions";

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

  return (
    <>
      <h1 className="display text-2xl sm:text-3xl mb-1">Drivers</h1>
      <p className="text-ink-muted mb-6">
        Your existing drivers. Only active ones appear when assigning a booking.
      </p>

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
                <tr className="text-[11px] uppercase tracking-widest text-ink-faint border-b border-line">
                  <th scope="col" className="text-left font-medium px-5 py-3">Name</th>
                  <th scope="col" className="text-left font-medium px-4 py-3">WhatsApp</th>
                  <th scope="col" className="text-left font-medium px-4 py-3">Vehicle</th>
                  <th scope="col" className="text-right font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((driver) => (
                  <tr
                    key={driver.id}
                    className="border-b border-line last:border-0 hover:bg-field/60"
                  >
                    <td className="px-5 py-3.5 font-medium">{driver.name}</td>
                    <td className="px-4 py-3.5">
                      <a
                        href={whatsappLink(
                          driver.whatsappNumber,
                          `Hi ${driver.name}, are you available for a job?`,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[13px] hover:text-accent-strong"
                      >
                        +{driver.whatsappNumber}
                      </a>
                    </td>
                    <td className="px-4 py-3.5 text-ink-muted">
                      {driver.vehicleAssigned ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
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
