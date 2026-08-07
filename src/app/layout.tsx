import type { Metadata } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BRAND, siteUrl } from "@/lib/seo";

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
  // Without metadataBase, Open Graph and canonical URLs resolve relative and
  // are wrong everywhere except localhost.
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${BRAND} — Chauffeur & Airport Transfers in Dubai, Abu Dhabi & Sharjah`,
    template: `%s | ${BRAND}`,
  },
  description:
    "Book chauffeur rides, airport transfers, city tours and hourly cars across Dubai, Abu Dhabi and Sharjah. Instant fare estimates, confirmed over WhatsApp. Available 24/7.",
  openGraph: {
    siteName: BRAND,
    locale: "en_AE",
    type: "website",
  },
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
