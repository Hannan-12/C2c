import Link from "next/link";
import { BUSINESS } from "@/lib/seo";
import { BreadcrumbSchema, ServiceSchema } from "./structured-data";

/**
 * Shared shell for the service pages (docs Section 9).
 *
 * Every service page carries one dark data slab specific to that service —
 * routes and fares, airport codes, an hour ladder, the fleet. That extends the
 * route board's language rather than inventing a second visual system: this is
 * a transport business, and its own vernacular is timetables and signage.
 */

export type ServicePageContent = {
  eyebrow: string;
  title: React.ReactNode;
  intro: string;
  /**
   * Large-set codes drawn from the subject's own world (airport IATA codes,
   * emirate abbreviations). Typographic rather than photographic — the client
   * has no photography yet, and stock imagery would say nothing true.
   */
  codes?: { code: string; label: string }[];
  /** Banner photograph for this service — see service-photo.tsx. */
  art?: React.ReactNode;
  /** What the customer actually gets. Kept concrete — no marketing adjectives. */
  included: { title: string; copy: string }[];
  /** The service's data slab: routes and prices, hour bands, fleet capacity. */
  table?: {
    heading: string;
    note?: string;
    caption: string;
    columns: string[];
    rows: (string | number)[][];
  };
  /**
   * A real sequence, shown as a rail. Only set this where order genuinely
   * carries information the reader needs — not as decoration.
   */
  sequence?: { label: string; copy: string }[];
  /** Answers specific to this service; the full set lives on /faqs. */
  faqs?: { question: string; answer: string }[];
  /** Prefilled query for the booking form, so the CTA lands ready to fill. */
  bookHref: string;
  /** Drives Service + BreadcrumbList JSON-LD for this page. */
  schema: { name: string; description: string; path: string };
};

export function ServicePage({ content }: { content: ServicePageContent }) {
  return (
    <div className="relative overflow-x-clip px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      <ServiceSchema {...content.schema} />
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: content.schema.name, path: content.schema.path },
        ]}
      />

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
          {content.eyebrow}
        </p>

        <h1
          className="animate-rise display text-[2.5rem] sm:text-5xl leading-[0.98] mb-6"
          style={{ animationDelay: "120ms" }}
        >
          {content.title}
        </h1>

        <p
          className="animate-rise text-ink-muted text-lg leading-relaxed mb-8"
          style={{ animationDelay: "220ms" }}
        >
          {content.intro}
        </p>

        <div
          className="animate-rise flex flex-wrap gap-3"
          style={{ animationDelay: "320ms" }}
        >
          <Link href={content.bookHref} className="btn-primary">
            Get a fare
          </Link>
          <Link href="/track" className="btn-secondary">
            Track a booking
          </Link>
        </div>
      </section>

      {content.art}

      {content.codes && <CodeBand codes={content.codes} />}

      {content.sequence && <SequenceRail steps={content.sequence} />}

      <section className="reveal mt-20" aria-labelledby="included-heading">
        <h2 id="included-heading" className="display text-2xl sm:text-3xl mb-7">
          What&apos;s included
        </h2>

        {/* Ruled rows rather than a card grid — same rhythm as the homepage
            index, and it keeps the dark slabs as the only heavy elements. */}
        <ul className="border-t border-line">
          {content.included.map((item) => (
            <li
              key={item.title}
              className="grid sm:grid-cols-[minmax(0,15rem)_1fr] gap-x-8 gap-y-1
                         border-b border-line py-5"
            >
              <h3 className="font-semibold flex items-baseline gap-2.5">
                <span className="size-1.5 rounded-full bg-accent shrink-0" aria-hidden />
                {item.title}
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed max-w-xl">
                {item.copy}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {content.table && <DataSlab table={content.table} />}

      {content.faqs && content.faqs.length > 0 && (
        <section className="reveal mt-20" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="display text-2xl sm:text-3xl mb-7">
            Common questions
          </h2>
          <FaqList items={content.faqs} />
        </section>
      )}

      <section className="reveal mt-20 mb-6">
        <div className="rounded-card bg-dock text-ink-inverse p-8 sm:p-10">
          <h2 className="display text-2xl sm:text-3xl mb-2">Ready when you are</h2>
          <p className="text-ink-inverse/70 mb-7 max-w-lg leading-relaxed">
            Send us the route and someone confirms the car, the driver and the
            fare with you directly. We answer {BUSINESS.openingHoursLabel}.
          </p>
          <Link href={content.bookHref} className="btn-primary">
            Get a fare
          </Link>
        </div>
      </section>
    </div>
  );
}

/**
 * Codes set large, in the display face — the page's one loud moment.
 *
 * An airport code is the most compressed thing in this business: three letters
 * that stand for a terminal, a drive and a fare. Setting them at display size
 * is the closest this page gets to a photograph, and it is actually true.
 */
function CodeBand({ codes }: { codes: { code: string; label: string }[] }) {
  return (
    <section className="reveal mt-16" aria-label="Airports served">
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line rounded-card overflow-hidden">
        {codes.map((item) => (
          <li
            key={item.code}
            className="group bg-canvas px-5 py-7 transition-colors duration-300
                       ease-out-soft hover:bg-surface"
          >
            <p
              className="display text-4xl sm:text-5xl leading-none mb-2
                         transition-colors duration-300 group-hover:text-accent-strong"
            >
              {item.code}
            </p>
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">
              {item.label}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A rail for content where order is real — the steps of a transfer happen in
 * this sequence and the reader needs to know which follows which. Numbered
 * markers are earned here; they are not used anywhere the order is arbitrary.
 */
function SequenceRail({ steps }: { steps: { label: string; copy: string }[] }) {
  return (
    <section className="reveal mt-16" aria-label="How it runs">
      <ol className="relative grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
        {/* The rail itself: a hairline the nodes sit on, desktop only. */}
        <div
          aria-hidden
          className="hidden xl:block absolute left-0 right-0 top-2 h-px bg-line"
        />

        {steps.map((step, i) => (
          <li key={step.label} className="relative">
            <span
              aria-hidden
              className="block size-4 rounded-full bg-canvas border-2 border-accent mb-4"
            />
            <span className="tnum block font-mono text-xs text-accent-strong mb-2">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="font-semibold mb-1">{step.label}</h3>
            <p className="text-sm text-ink-muted leading-relaxed">{step.copy}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The service's data slab. Same construction as the route board so the two
 * read as one system: dark ground, hairline rules, figures in tabular mono.
 */
function DataSlab({ table }: { table: NonNullable<ServicePageContent["table"]> }) {
  return (
    <section className="reveal mt-20" aria-labelledby="slab-heading">
      <h2 id="slab-heading" className="display text-2xl sm:text-3xl mb-1.5">
        {table.heading}
      </h2>
      {table.note && <p className="text-ink-muted mb-7">{table.note}</p>}

      <div className="rounded-card bg-dock text-ink-inverse overflow-x-auto">
        <table className="w-full text-sm min-w-130">
          <caption className="sr-only">{table.caption}</caption>
          <thead>
            <tr className="text-[11px] uppercase tracking-widest text-ink-inverse/40">
              {table.columns.map((column, i) => (
                <th
                  key={column}
                  scope="col"
                  className={`font-medium py-3 ${
                    i === 0 ? "text-left px-5 sm:px-6" : "text-right px-4 last:px-5 sm:last:px-6"
                  }`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr
                key={String(row[0])}
                className="border-t border-dock-border transition-colors duration-200 hover:bg-white/5"
              >
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th
                      key={i}
                      scope="row"
                      className="text-left font-medium px-5 sm:px-6 py-3.5"
                    >
                      {cell}
                    </th>
                  ) : (
                    <td
                      key={i}
                      className={`tnum text-right font-mono px-4 py-3.5 last:px-5 sm:last:px-6 ${
                        i === row.length - 1 ? "text-accent" : "text-ink-inverse/70"
                      }`}
                    >
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Native <details> rather than a JS accordion: it is keyboard accessible and
 * findable by the browser's in-page search without any client bundle, and the
 * answers stay in the HTML for crawlers.
 */
export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <ul className="border-t border-line">
      {items.map((item) => (
        <li key={item.question}>
          <details className="group border-b border-line">
            <summary
              className="flex items-baseline justify-between gap-6 py-5 px-3 -mx-3
                         cursor-pointer list-none rounded-field
                         transition-colors duration-300 hover:bg-surface"
            >
              <span className="font-medium">{item.question}</span>
              <span
                className="text-ink-faint shrink-0 transition-transform duration-300
                           ease-out-soft group-open:rotate-45"
                aria-hidden
              >
                +
              </span>
            </summary>
            <p className="text-sm text-ink-muted leading-relaxed pb-5 px-3 -mx-3 max-w-2xl">
              {item.answer}
            </p>
          </details>
        </li>
      ))}
    </ul>
  );
}
