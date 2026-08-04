import type { Metadata } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Display face: a grotesque with transport-signage character, used only for
 * headings and the route board. Body and figures stay on Geist so the display
 * face keeps its impact.
 */
const archivo = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RideBook — Chauffeur & Airport Transfers in the UAE",
    template: "%s | RideBook",
  },
  description:
    "Book chauffeur rides, airport transfers, city tours and hourly cars across the UAE. Instant fare estimates, confirmed over WhatsApp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
