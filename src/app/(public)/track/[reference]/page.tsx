import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getBookingByReference } from "@/lib/booking-lookup";
import {
  SERVICE_LABEL,
  STATUS_LABEL,
  TIMELINE,
  VEHICLE_LABEL,
  timelineIndex,
} from "@/lib/booking-status";
import {
  formatDistance,
  formatDuration,
  formatFare,
  formatPickup,
  whatsappLink,
} from "@/lib/format";
import { rateLimit } from "@/lib/rate-limit";
import { PayButton } from "@/components/pay-button";
import { paymentsEnabled } from "@/lib/payments/stripe";

/** Status changes as the admin works the booking, so never cache this. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your booking",
  // A page containing customer details must never reach a search index.
  robots: { index: false, follow: false },
};

const LOOKUP_LIMIT = 20;
const LOOKUP_WINDOW_MS = 10 * 60 * 1000;

export default async function TrackingPage({
  params,
  searchParams,
}: PageProps<"/track/[reference]">) {
  const { reference } = await params;
  const query = await searchParams;
  const justBooked = query.new === "1";
  /**
   * Set by Stripe's success redirect. It is a hint, not proof: the customer
   * can close the tab before it fires, or open this URL by hand. The webhook
   * is what actually records payment, so this only softens the wait when the
   * banner arrives before the webhook has landed.
   */
  const returnedFromCheckout = query.paid === "1";

  // The page hits the database directly rather than its own API, so the same
  // per-IP limit has to be applied here too — otherwise the rate limit on the
  // API route would be trivially bypassed by requesting the page instead.
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  const limit = rateLimit(`track-page:${ip}`, LOOKUP_LIMIT, LOOKUP_WINDOW_MS);
  if (!limit.allowed) {
    return (
      <div className="px-6 sm:px-10 lg:px-14 py-14">
        <div className="card max-w-lg">
          <h1 className="display text-2xl mb-2">Too many lookups</h1>
          <p className="text-ink-muted">
            Please wait a few minutes and try again.
          </p>
        </div>
      </div>
    );
  }

  const booking = await getBookingByReference(reference);
  if (!booking) redirect("/track?notfound=1");

  const currentStep = timelineIndex(booking.status);
  const cancelled = booking.status === "cancelled";
  const adminNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? "";

  return (
    <div className="px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      {justBooked && (
        <p
          role="status"
          className="mb-7 rounded-card border border-accent bg-accent-soft px-5 py-4 max-w-2xl"
        >
          <span className="block font-semibold mb-0.5">Booking request sent</span>
          <span className="block text-sm text-ink-muted">
            Save your reference code. We&apos;ll confirm the driver and final
            fare with you on WhatsApp shortly.
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint mb-2">
            Booking reference
          </p>
          <h1 className="animate-rise display text-3xl sm:text-4xl font-mono">
            {booking.referenceCode}
          </h1>
        </div>

        <span
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            cancelled
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-dock text-accent"
          }`}
        >
          {STATUS_LABEL[booking.status]}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start max-w-5xl">
        <div>
          {cancelled ? (
            <div className="card border-red-200">
              <h2 className="font-semibold mb-1">This booking was cancelled</h2>
              <p className="text-sm text-ink-muted">
                If this wasn&apos;t expected, message us on WhatsApp and
                we&apos;ll sort it out.
              </p>
            </div>
          ) : (
            <ol className="card">
              {TIMELINE.map((step, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <li
                    key={step.status}
                    className="animate-rise flex gap-4 pb-6 last:pb-0 relative"
                    style={{ animationDelay: `${i * 70}ms` }}
                    aria-current={active ? "step" : undefined}
                  >
                    {i < TIMELINE.length - 1 && (
                      <span
                        className={`absolute left-2.75 top-6 bottom-0 w-px ${
                          done ? "bg-accent" : "bg-line"
                        }`}
                        aria-hidden
                      />
                    )}

                    <span
                      className={`relative z-10 mt-0.5 size-6 shrink-0 rounded-full grid place-items-center
                                  text-[11px] font-bold ${
                                    done
                                      ? "bg-accent text-ink"
                                      : active
                                        ? "bg-dock text-accent ring-4 ring-accent-soft animate-pop"
                                        : "bg-field text-ink-faint"
                                  }`}
                      aria-hidden
                    >
                      {done ? "✓" : i + 1}
                    </span>

                    <span className="min-w-0">
                      <span
                        className={`block font-semibold ${
                          done || active ? "text-ink" : "text-ink-faint"
                        }`}
                      >
                        {step.label}
                      </span>
                      {active && (
                        <span className="block text-sm text-ink-muted mt-0.5">
                          {step.copy}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          <section className="card mt-4">
            <h2 className="font-semibold mb-4">Trip details</h2>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3.5 text-sm">
              <Detail label="Service" value={SERVICE_LABEL[booking.serviceType]} />
              <Detail
                label="Pickup time"
                value={formatPickup(booking.pickupDatetime)}
              />
              <Detail label="From" value={booking.pickupLocation} />
              <Detail label="To" value={booking.dropoffLocation ?? undefined} />
              <Detail
                label="Duration"
                value={
                  booking.durationHours
                    ? `${booking.durationHours} hours`
                    : undefined
                }
              />
              <Detail label="Flight" value={booking.flightNumber ?? undefined} />
              <Detail
                label="Vehicle"
                value={VEHICLE_LABEL[booking.vehicleCategory]}
              />
              <Detail
                label="Passengers"
                value={`${booking.passengerCount} · ${booking.luggageCount} bags`}
              />
              <Detail
                label="Trip"
                value={
                  booking.distanceKm
                    ? [
                        formatDistance(Number(booking.distanceKm)),
                        booking.durationMin ? formatDuration(booking.durationMin) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : undefined
                }
              />
              <Detail
                label="Estimated fare"
                value={
                  booking.fareEstimate
                    ? formatFare(Number(booking.fareEstimate))
                    : "Confirmed with you directly"
                }
              />
            </dl>
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 flex flex-col gap-4">
          {booking.paymentMethod === "card" && !cancelled && (
            <section className="animate-rise card">
              <h2 className="text-sm font-bold uppercase tracking-widest text-ink-faint mb-3">
                Payment
              </h2>

              {booking.paymentStatus === "paid" ? (
                <>
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-green-700">Paid</span>
                    {booking.amountPaid && (
                      <span className="font-mono font-semibold">
                        {formatFare(Number(booking.amountPaid))}
                      </span>
                    )}
                  </p>
                  {booking.paidAt && (
                    <p className="mt-1 text-xs text-ink-faint">
                      Received {formatPickup(booking.paidAt.toISOString())}
                    </p>
                  )}
                </>
              ) : booking.fareEstimate && paymentsEnabled() ? (
                <>
                  <p className="mb-3 text-sm text-ink-muted">
                    {returnedFromCheckout
                      ? "We're confirming your payment with the bank. This page updates once it clears — you don't need to pay again."
                      : "Your fare is agreed. Pay securely by card, or settle with the driver if you'd rather."}
                  </p>
                  {!returnedFromCheckout && (
                    <>
                      <p className="mb-3 flex items-baseline justify-between gap-3">
                        <span className="text-ink-muted">Amount</span>
                        <span className="font-mono text-lg font-bold">
                          {formatFare(Number(booking.fareEstimate))}
                        </span>
                      </p>
                      <PayButton reference={booking.referenceCode} />
                      <p className="mt-2 text-[11px] text-ink-faint">
                        Handled by Stripe. We never see your card details.
                      </p>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-muted">
                  We&apos;ll confirm the fare with you first, then send a secure
                  payment link.
                </p>
              )}
            </section>
          )}

          {booking.driver ? (
            <section className="animate-rise rounded-card bg-dock text-ink-inverse p-5">
              <h2 className="text-sm font-bold uppercase tracking-widest mb-4">
                Your driver
              </h2>
              <p className="text-lg font-semibold">{booking.driver.name}</p>
              {booking.driver.vehicle && (
                <p className="text-sm text-ink-inverse/55 mt-0.5">
                  {booking.driver.vehicle}
                </p>
              )}
              <a
                href={whatsappLink(
                  booking.driver.whatsapp,
                  `Hi, this is ${booking.customerName} — booking ${booking.referenceCode}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-field
                           bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white
                           hover:brightness-95 transition"
              >
                Message your driver
              </a>
            </section>
          ) : (
            !cancelled && (
              <section className="card">
                <h2 className="font-semibold mb-1">Driver details</h2>
                <p className="text-sm text-ink-muted">
                  Your driver&apos;s name and number will appear here once
                  they&apos;re assigned.
                </p>
              </section>
            )
          )}

          <a
            href={whatsappLink(
              adminNumber,
              `Hi, I have a question about booking ${booking.referenceCode}.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="card card-interactive"
          >
            <span className="block font-semibold mb-0.5">Need to change something?</span>
            <span className="block text-sm text-ink-muted">
              Message us on WhatsApp — your reference is filled in for you.
            </span>
          </a>

          <Link href="/book" className="btn-secondary w-full">
            Book another ride
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-ink-faint text-xs mb-0.5">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
