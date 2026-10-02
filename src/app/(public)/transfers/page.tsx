import Link from "next/link";
import type { Metadata } from "next";
import { TRANSFERS, transferMetaDescription } from "@/data/transfers";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Chauffeur Transfer Routes",
  description: "Browse private chauffeur transfer routes between Dubai airports, Dubai, Abu Dhabi and Sharjah.",
  path: "/transfers",
});

export default function TransfersIndexPage() {
  return (
    <main className="relative overflow-x-clip px-6 sm:px-10 lg:px-14 py-10 lg:py-14">
      <section className="max-w-3xl mb-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint mb-6">Dubai · Abu Dhabi · Sharjah</p>
        <h1 className="display text-[2.5rem] sm:text-5xl leading-[0.98] mb-6">Chauffeur transfer routes</h1>
        <p className="text-ink-muted text-lg leading-relaxed">Browse airport and intercity routes, review typical journey information and request a fixed fare before you book.</p>
      </section>
      <ul className="grid gap-3 sm:grid-cols-2">
        {TRANSFERS.map((route) => (
          <li key={route.slug}>
            <Link className="group block rounded-card border border-line bg-surface p-5 transition-colors hover:bg-surface/70" href={`/transfers/${route.slug}`}>
              <span className="block font-semibold group-hover:text-accent-strong">{route.h1} →</span>
              <span className="mt-2 block text-sm leading-relaxed text-ink-muted">{transferMetaDescription(route)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
