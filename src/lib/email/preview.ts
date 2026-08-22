/**
 * Renders every customer email to HTML files so they can be checked in a
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
import { bookingConfirmed, bookingRequestReceived, refundIssued } from "./templates";
import { REFUND_BANK_DAYS_LABEL } from "@/lib/service-terms";

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
  [
    "confirmed-card",
    bookingConfirmed(sample, "https://checkout.stripe.com/c/pay/cs_test_example"),
  ],
  // Both refund shapes: the partial one has to show what was kept as well as
  // what came back, and that arithmetic is the part worth looking at.
  [
    "refund-full",
    refundIssued(sample, {
      amountRefunded: 185,
      amountPaid: 185,
      whole: true,
      bankDaysLabel: REFUND_BANK_DAYS_LABEL,
    }),
  ],
  [
    "refund-partial",
    refundIssued(sample, {
      amountRefunded: 92.5,
      amountPaid: 185,
      whole: false,
      bankDaysLabel: REFUND_BANK_DAYS_LABEL,
    }),
  ],
] as const) {
  const path = `${outDir}/email-${name}.html`;
  writeFileSync(path, message.html);
  console.log(`${message.subject}\n  → ${path}`);
}
