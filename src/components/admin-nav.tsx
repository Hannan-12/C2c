"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Bookings", exact: true },
  { href: "/admin/drivers", label: "Drivers", exact: false },
  { href: "/admin/pricing", label: "Pricing", exact: false },
  { href: "/admin/finance", label: "Money", exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
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
