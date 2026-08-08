import { BUSINESS } from "@/lib/seo";

/**
 * Typographic shell for long-form legal text.
 *
 * Narrow measure, generous leading, and headings that are scannable — a
 * privacy policy is read by someone looking for one specific answer, not
 * front to back.
 */
export function LegalPage({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro: string;
  /** Shown so a reader can tell whether the policy changed since they last looked. */
  updated: string;
  sections: { heading: string; body: React.ReactNode }[];
}) {
  return (
    <div className="relative px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      <article className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint mb-6">
          Legal
        </p>

        <h1 className="display text-[2.5rem] sm:text-5xl leading-[0.98] mb-5">
          {title}
        </h1>

        <p className="text-ink-muted text-lg leading-relaxed mb-3">{intro}</p>
        <p className="text-sm text-ink-faint mb-10">Last updated {updated}</p>

        {/* A short index: most readers arrive wanting one section. */}
        <nav aria-label="Contents" className="card mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-faint mb-3">
            Contents
          </p>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {sections.map((section, i) => (
              <li key={section.heading}>
                <a
                  href={`#${slug(section.heading)}`}
                  className="text-ink-muted hover:text-accent-strong transition-colors"
                >
                  <span className="tnum font-mono text-xs text-ink-faint mr-2">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10">
          {sections.map((section, i) => (
            <section key={section.heading} id={slug(section.heading)} className="scroll-mt-8">
              <h2 className="display text-xl sm:text-2xl mb-3 flex items-baseline gap-3">
                <span className="tnum font-mono text-xs text-accent-strong">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {section.heading}
              </h2>
              <div className="text-ink-muted leading-relaxed space-y-3 [&_ul]:space-y-2 [&_ul]:mt-1 [&_strong]:text-ink [&_strong]:font-semibold">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 pt-8 border-t border-line text-sm text-ink-faint">
          Questions about this policy? Message us on WhatsApp or email{" "}
          <a href={`mailto:${BUSINESS.email}`} className="text-ink-muted hover:text-accent-strong">
            {BUSINESS.email}
          </a>
          .
        </p>
      </article>
    </div>
  );
}

function slug(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Bulleted list in the legal voice — hairline markers, not heavy dots. */
export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="size-1.5 rounded-full bg-accent shrink-0 mt-2.5" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
