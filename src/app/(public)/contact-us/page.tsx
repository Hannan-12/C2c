import Link from "next/link";
import { BUSINESS, pageMetadata } from "@/lib/seo";
import { formatPhone, whatsappLink } from "@/lib/format";

export const metadata = pageMetadata({
  title: "Contact Us",
  description:
    "Message Ride On Click on WhatsApp for bookings, changes and questions. Available any hour, any day across Dubai, Abu Dhabi and Sharjah.",
  path: "/contact-us",
});

/**
 * TODO(client): BUSINESS.email is still a placeholder. It surfaces here and
 * in the site header, so replacing it in seo.ts fixes every appearance.
 *
 * No physical address is shown: the business does not operate a walk-in
 * office, and publishing one it does not have would be worse than omitting it.
 */
export default function ContactPage() {
  const whatsapp = whatsappLink(BUSINESS.whatsapp, "Hi, I'd like to ask about a booking.");

  return (
    <div className="relative px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 size-152
                   rounded-full bg-accent/12 blur-3xl animate-drift"
      />

      <section className="relative max-w-2xl">
        <p
          className="animate-rise text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint mb-6"
          style={{ animationDelay: "40ms" }}
        >
          Contact
        </p>

        <h1
          className="animate-rise display text-[2.5rem] sm:text-5xl leading-[0.98] mb-6"
          style={{ animationDelay: "120ms" }}
        >
          Message us.
          <br />
          <span className="text-accent-strong">Someone reads it.</span>
        </h1>

        <p
          className="animate-rise text-ink-muted text-lg leading-relaxed mb-8"
          style={{ animationDelay: "220ms" }}
        >
          WhatsApp is the fastest way to reach us — it&apos;s where bookings are
          confirmed and where changes get handled. We answer{" "}
          {BUSINESS.openingHoursLabel}.
        </p>

        <div
          className="animate-rise flex flex-wrap gap-3"
          style={{ animationDelay: "320ms" }}
        >
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Chat on WhatsApp
          </a>
          <Link href="/book" className="btn-secondary">
            Get a fare
          </Link>
        </div>
      </section>

      <section className="reveal mt-16" aria-labelledby="ways-heading">
        <h2 id="ways-heading" className="display text-2xl sm:text-3xl mb-7">
          Ways to reach us
        </h2>

        <ul className="grid gap-px bg-line rounded-card overflow-hidden sm:grid-cols-3">
          {[
            {
              label: "WhatsApp",
              value: formatPhone(BUSINESS.whatsapp),
              href: whatsapp,
              note: "Bookings, changes, questions",
            },
            {
              label: "Email",
              value: BUSINESS.email,
              href: `mailto:${BUSINESS.email}`,
              note: "Invoices and corporate accounts",
            },
            {
              label: "Hours",
              value: "24 / 7",
              note: "Every day, including holidays",
            },
          ].map((item) => (
            <li key={item.label} className="bg-canvas px-5 py-6">
              <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint mb-2">
                {item.label}
              </p>
              {item.href ? (
                <a
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="font-semibold hover:text-accent-strong transition-colors break-words"
                >
                  {item.value}
                </a>
              ) : (
                <p className="font-semibold">{item.value}</p>
              )}
              <p className="text-sm text-ink-muted mt-1.5">{item.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="reveal mt-16" aria-labelledby="areas-heading">
        <h2 id="areas-heading" className="display text-2xl sm:text-3xl mb-1.5">
          Where we operate
        </h2>
        <p className="text-ink-muted mb-7">
          Pickups and drop-offs across three emirates, including trips between
          them.
        </p>

        <ul className="flex flex-wrap gap-2">
          {BUSINESS.areasServed.map((area) => (
            <li
              key={area}
              className="rounded-field border border-line bg-surface px-4 py-2 text-sm font-medium"
            >
              {area}
            </li>
          ))}
        </ul>
      </section>

      <section className="reveal mt-20 mb-6">
        <div className="rounded-card bg-dock text-ink-inverse p-8 sm:p-10">
          <h2 className="display text-2xl sm:text-3xl mb-2">
            Already booked with us?
          </h2>
          <p className="text-ink-inverse/70 mb-7 max-w-lg leading-relaxed">
            Have your reference code ready — it lets us pull up your trip
            straight away.
          </p>
          <Link href="/track" className="btn-primary">
            Track a booking
          </Link>
        </div>
      </section>
    </div>
  );
}
