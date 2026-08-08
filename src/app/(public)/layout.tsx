import { BookingDock, NAV, SECONDARY } from "@/components/booking-dock";
import { MobileChrome } from "@/components/mobile-chrome";

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
      <div className="flex-1 min-w-0 bg-canvas pb-24 lg:pb-0">{children}</div>
    </div>
  );
}
