"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { whatsappLink } from "@/lib/format";
import Image from "next/image";
import { BRAND } from "@/lib/seo";
import { PlaceInput } from "./place-input";
import type { ServiceType } from "@/db/schema";

export const NAV = [
  { href: "/book", label: "Book a Ride" },
  { href: "/airport-rides", label: "Airport Transfers" },
  { href: "/city-tour", label: "City Tours" },
  { href: "/track", label: "Track Booking" },
  { href: "/faqs", label: "Help Center" },
];

export const SECONDARY = [
  { href: "/about-us", label: "About" },
  { href: "/contact-us", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

const QUICK_TABS: { id: ServiceType; label: string }[] = [
  { id: "ride", label: "Rides" },
  { id: "hourly", label: "Hourly" },
  { id: "city_tour", label: "Tour" },
];

/**
 * The persistent left panel (docs Section 13.1): nav, a quick booking form,
 * and a WhatsApp card. Stays fixed while page content scrolls independently
 * on the right — the defining feature of the approved Split Dock direction.
 *
 * Desktop only. Below `lg` it would stack above the page and push content off
 * the first screen, so phones get MobileChrome instead: a slim header, a nav
 * sheet, and a fixed bottom action bar.
 */
export function BookingDock() {
  const pathname = usePathname();
  const router = useRouter();

  const [serviceType, setServiceType] = useState<ServiceType>("ride");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");

  const isHourly = serviceType === "hourly";
  const adminNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? "";

  // The dock's own form is a starting point, not the whole booking — it hands
  // off to /book with what's been entered so far.
  const onBookingPage = pathname === "/book";

  const reference = pathname.startsWith("/track/")
    ? decodeURIComponent(pathname.split("/")[2] ?? "")
    : null;

  function handleQuickSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({ serviceType, pickup, date, time });
    if (!isHourly && dropoff) params.set("dropoff", dropoff);
    router.push(`/book?${params.toString()}`);
  }

  return (
    <aside
      className="hidden lg:flex bg-dock text-ink-inverse flex-col lg:h-screen lg:sticky
                 lg:top-0 lg:overflow-y-auto lg:w-90 xl:w-100 shrink-0 px-7 py-8"
    >
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <Image
          src="/images/logo-mark.png"
          alt=""
          width={678}
          height={220}
          className="h-5 w-auto"
          priority
        />
        <span className="text-lg font-bold tracking-tight">{BRAND}</span>
      </Link>

      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-field px-3.5 py-2.5 text-sm
                transition-[background-color,color,transform] duration-200
                ease-out-soft
                hover:translate-x-0.5 ${
                active
                  ? "bg-dock-active text-accent font-semibold"
                  : "text-ink-inverse/70 hover:text-ink-inverse hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Hidden on /book, where the full form already owns these fields. */}
      {!onBookingPage && (
        <section className="mt-8" aria-label="Quick booking">
          <h2 className="text-sm font-semibold mb-3">Quick Booking</h2>

          <div role="tablist" aria-label="Service type" className="flex gap-1 mb-3">
            {QUICK_TABS.map((tab) => {
              const active = tab.id === serviceType;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setServiceType(tab.id)}
                  className={`flex-1 rounded-field px-2 py-2 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-accent text-ink"
                      : "bg-white/6 text-ink-inverse/70 hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleQuickSubmit} className="flex flex-col gap-2.5">
            <div>
              <label className="field-label-dark" htmlFor="dock-pickup">
                From
              </label>
              <PlaceInput
                id="dock-pickup"
                value={pickup}
                onChange={setPickup}
                placeholder="Dubai International Airport"
                required
                dark
              />
            </div>

            {!isHourly && (
              <div>
                <label className="field-label-dark" htmlFor="dock-dropoff">
                  To
                </label>
                <PlaceInput
                  id="dock-dropoff"
                  value={dropoff}
                  onChange={setDropoff}
                  placeholder="Burj Khalifa, Downtown"
                  required
                  dark
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div className="min-w-0">
                <label className="field-label-dark" htmlFor="dock-date">
                  Date
                </label>
                <input
                  id="dock-date"
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  className="field-input-dark scheme-dark min-w-0"
                  required
                />
              </div>
              <div className="min-w-0">
                <label className="field-label-dark" htmlFor="dock-time">
                  Time
                </label>
                <input
                  id="dock-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="field-input-dark scheme-dark min-w-0"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full mt-1.5">
              Continue →
            </button>
          </form>
        </section>
      )}

      <div className="mt-auto pt-8">
        <a
          href={whatsappLink(
            adminNumber,
            reference
              ? `Hi, I have a question about booking ${reference}.`
              : "Hi, I'd like to book a ride.",
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-card bg-dock-raised px-4 py-3.5
                     hover:bg-white/8 transition-colors"
        >
          <span
            className="size-8 rounded-full bg-whatsapp grid place-items-center shrink-0"
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="size-4 fill-white">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.29Z" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Need help?</span>
            <span className="block text-xs text-ink-inverse/55 truncate">
              Chat with us on WhatsApp
            </span>
          </span>
        </a>

        {/*
          Secondary links. Kept small and below the WhatsApp card so they do
          not compete with the booking flow, but present on every page — an
          unlinked page is one search engines will not reliably find, and
          these are the pages customers look for before trusting a new
          business.
        */}
        <nav aria-label="Company" className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
          {SECONDARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs text-ink-inverse/45 hover:text-ink-inverse/80 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <p className="mt-4 text-[11px] text-ink-inverse/30">
          © {new Date().getFullYear()} {BRAND}
        </p>
      </div>
    </aside>
  );
}
