"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: { href: string; label: string; exact: boolean; section?: string }[] = [
  { href: "/admin", label: "Bookings", exact: true },
  { href: "/admin/drivers/dubai", label: "Drivers", exact: false, section: "/admin/drivers" },
  { href: "/admin/pricing", label: "Pricing", exact: false },
  { href: "/admin/finance", label: "Money", exact: false },
  { href: "/admin/staff", label: "Staff", exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        // `section` exists for links whose landing page is one of several —
        // Drivers points at Dubai but must stay lit on Sharjah too.
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.section ?? item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-field px-3.5 py-2.5 text-sm transition-colors ${
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
  );
}
