import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Resolve the site URL for metadataBase / OG url:
//   1. NEXT_PUBLIC_SITE_URL — explicit override
//   2. VERCEL_URL          — current deployment (preview or prod) at build time
//   3. hard-coded prod URL — local dev / unknown environments
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
  "https://self-managing-codebase.vercel.app";

const title = "Trip Planner";
const description =
  "Plan trips with an AI travel planner — describe your destination, dates, and vibe, and get a day-by-day itinerary you can iterate on.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s · ${title}`,
  },
  description,
  applicationName: title,
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: title,
    title,
    description,
  },
  twitter: {
    // Use "summary" until we ship a real OG image asset; "summary_large_image"
    // without an image often renders as nothing on X / Slack / iMessage.
    card: "summary",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
