import { BookingDock, NAV, SECONDARY } from "@/components/booking-dock";
import { MobileChrome } from "@/components/mobile-chrome";
import Link from "next/link";
import { TRANSFERS } from "@/data/transfers";

/**
 * Split Dock shell (docs Section 13): fixed dock on the left, content
 * scrolling independently on the right. Stacks vertically below `lg`, since
 * a fixed panel would eat most of a phone screen.
 */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <MobileChrome nav={NAV} secondary={SECONDARY} />
      <BookingDock />
      {/* Bottom padding clears the fixed mobile action bar. */}
      <div className="flex-1 min-w-0 bg-canvas pb-24 lg:pb-0">
        {children}
        <footer className="border-t border-line px-6 sm:px-10 lg:px-14 py-8">
          <h2 className="display text-xl mb-4">Popular routes</h2>
          <nav aria-label="Popular transfer routes">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
              <li><Link className="hover:text-accent-strong" href="/transfers">All transfer routes</Link></li>
              {TRANSFERS.map((route) => <li key={route.slug}><Link className="hover:text-accent-strong" href={`/transfers/${route.slug}`}>{route.h1}</Link></li>)}
            </ul>
          </nav>
        </footer>
      </div>
    </div>
  );
}
