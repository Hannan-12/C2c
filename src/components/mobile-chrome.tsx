"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { whatsappLink } from "@/lib/format";
import { BRAND } from "@/lib/seo";

/**
 * Mobile navigation, replacing the dock below `lg`.
 *
 * The dock stacked above the page on phones, so every visit opened with a
 * logo, six links and a booking form before any content — roughly a screen
 * and a half of chrome. Most traffic for this business is mobile, so the
 * phone layout gets its own structure rather than a squeezed desktop one:
 *
 *   - a slim sticky header, so content is the first thing seen
 *   - navigation in a sheet, opened on demand
 *   - a fixed bottom bar carrying the two actions that matter, always in
 *     thumb reach: book a ride, and message us
 */
export function MobileChrome({
  nav,
  secondary,
}: {
  nav: { href: string; label: string }[];
  secondary: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const adminNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? "";
  const reference = pathname.startsWith("/track/")
    ? decodeURIComponent(pathname.split("/")[2] ?? "")
    : null;

  const whatsapp = whatsappLink(
    adminNumber,
    reference
      ? `Hi, I have a question about booking ${reference}.`
      : "Hi, I'd like to book a ride.",
  );

  // A sheet over the page shouldn't let the page scroll underneath it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <header className="sticky top-0 z-40 bg-dock text-ink-inverse border-b border-dock-border">
        <div className="flex items-center justify-between px-5 h-14">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/images/logo-mark.png"
              alt=""
              width={678}
              height={220}
              className="h-4 w-auto"
              priority
            />
            <span className="font-bold tracking-tight">{BRAND}</span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="-mr-2 p-2 rounded-field hover:bg-white/10 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="size-6 stroke-current fill-none" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          <nav
            aria-label="Main"
            className="absolute right-0 top-0 bottom-0 w-[min(20rem,85vw)]
                       bg-dock text-ink-inverse flex flex-col px-6 py-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="font-bold tracking-tight">{BRAND}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="-mr-2 p-2 rounded-field hover:bg-white/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="size-6 stroke-current fill-none" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <ul className="flex flex-col gap-1">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-field px-4 py-3 text-[15px] transition-colors ${
                        active
                          ? "bg-dock-active text-accent font-semibold"
                          : "text-ink-inverse/75 hover:bg-white/5"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <ul className="mt-8 pt-6 border-t border-dock-border flex flex-wrap gap-x-5 gap-y-3">
              {secondary.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="text-sm text-ink-inverse/50 hover:text-ink-inverse transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mt-auto pt-8 text-[11px] text-ink-inverse/30">
              © {new Date().getFullYear()} {BRAND}
            </p>
          </nav>
        </div>
      )}

      {/*
        Fixed action bar. pb-[env(safe-area-inset-bottom)] keeps it clear of
        the home indicator on notched iPhones, where a bar flush to the bottom
        is partly untappable.
      */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-dock/95 backdrop-blur
                   border-t border-dock-border px-4 py-3
                   pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center gap-3">
          <Link href="/book" className="btn-primary flex-1">
            Book a ride
          </Link>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            className="grid place-items-center size-12 shrink-0 rounded-field bg-whatsapp"
          >
            <svg viewBox="0 0 24 24" className="size-6 fill-white" aria-hidden>
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.29Z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
