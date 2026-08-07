/**
 * Renders both booking emails to HTML files so they can be checked in a
 * browser without a Resend account, a verified domain, or a database.
 *
 *   npm run email:preview
 *
 * Uses deliberately awkward sample data — quotes, an ampersand and angle
 * brackets in the customer name — because escaping bugs only show up on input
 * like this, and the name comes from a public form.
 */
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { bookingConfirmed, bookingRequestReceived } from "./templates";

// Defaults to a temp directory rather than the repo, so previewing never
// leaves untracked HTML in the working tree. Pass a path to override.
const outDir = process.argv[2] ?? tmpdir();

const sample = {
  referenceCode: "C2C-7K4M2XQP",
  serviceType: "airport" as const,
  customerName: 'Aisha "AJ" O\'Brien & Co <script>',
  customerEmail: "aisha@example.com",
  pickupLocation: "Dubai Marina, Tower 4 & 5",
  dropoffLocation: "DXB Terminal 3",
  pickupDatetime: new Date("2026-10-01T06:30:00Z"),
  durationHours: null,
  flightNumber: "EK203",
  distanceKm: 34.7,
  durationMin: 42,
  fareEstimate: 185,
};

for (const [name, message] of [
  ["requested", bookingRequestReceived(sample)],
  ["confirmed", bookingConfirmed(sample)],
] as const) {
  const path = `${outDir}/email-${name}.html`;
  writeFileSync(path, message.html);
  console.log(`${message.subject}\n  → ${path}`);
}
