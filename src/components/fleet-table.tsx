import { getFleet } from "@/lib/fleet";

/**
 * Vehicle classes with capacity and starting fares.
 *
 * Every figure here is one a customer will hold us to, so none of them is
 * typed into this file. Capacity comes from VEHICLE_SPECS — the same constant
 * the server validates a booking against, so the table cannot advertise room
 * the form then refuses — and the fare comes from the pricing table the quote
 * is calculated from.
 */
export async function FleetTable() {
  const fleet = await getFleet();

  return (
    <div className="rounded-card bg-dock text-ink-inverse overflow-x-auto">
      <table className="w-full text-sm min-w-130">
        <caption className="sr-only">
          Vehicle classes with capacity and starting fares
        </caption>
        <thead>
          <tr className="text-[11px] uppercase tracking-widest text-ink-inverse/40">
            <th scope="col" className="text-left font-medium px-5 sm:px-6 py-3">
              Class
            </th>
            <th scope="col" className="text-right font-medium px-4 py-3">
              Seats
            </th>
            <th scope="col" className="text-right font-medium px-4 py-3">
              Bags
            </th>
            <th scope="col" className="text-right font-medium px-5 sm:px-6 py-3">
              From
            </th>
          </tr>
        </thead>
        <tbody>
          {fleet.map((vehicle) => (
            <tr
              key={vehicle.id}
              className="border-t border-dock-border transition-colors duration-200 hover:bg-white/5"
            >
              <th scope="row" className="text-left font-medium px-5 sm:px-6 py-3.5">
                {vehicle.label}
                <span className="block text-[11px] font-normal text-ink-inverse/40">
                  {vehicle.blurb}
                </span>
              </th>
              <td className="tnum text-right font-mono px-4 py-3.5 text-ink-inverse/70">
                {vehicle.seats}
              </td>
              <td className="tnum text-right font-mono px-4 py-3.5 text-ink-inverse/70">
                {vehicle.bags}
              </td>
              <td className="tnum text-right font-mono px-5 sm:px-6 py-3.5 text-accent">
                AED {vehicle.from}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
