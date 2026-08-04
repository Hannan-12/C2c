import { BookingDock } from "@/components/booking-dock";

/**
 * Split Dock shell (docs Section 13): fixed dock on the left, content
 * scrolling independently on the right. Stacks vertically below `lg`, since
 * a fixed panel would eat most of a phone screen.
 */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <BookingDock />
      <div className="flex-1 min-w-0 bg-canvas">{children}</div>
    </div>
  );
}
