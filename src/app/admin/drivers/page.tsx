import { redirect } from "next/navigation";
import { EMIRATE_SLUG } from "@/lib/emirates";

/**
 * Drivers are kept per emirate, so there is no combined list to show here.
 * Dubai is where most of them are, which makes it the least surprising place
 * to land from a nav link that just says "Drivers".
 */
export default function DriversIndex() {
  redirect(`/admin/drivers/${EMIRATE_SLUG.dubai}`);
}
