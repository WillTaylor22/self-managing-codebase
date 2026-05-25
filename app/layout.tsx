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
//   1. NEXT_PUBLIC_SITE_URL              — explicit override
//   2. prod: VERCEL_PROJECT_PRODUCTION_URL — canonical alias, stable across deploys
//   3. preview/dev: VERCEL_URL            — per-deploy URL so preview shares work
//   4. hard-coded prod URL                — local dev / unknown environments
//
// Using VERCEL_URL for prod fragments social signals because every deploy
// publishes a unique og:url. VERCEL_PROJECT_PRODUCTION_URL is the canonical
// production alias (e.g. "self-managing-codebase.vercel.app").
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_ENV === "production"
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "self-managing-codebase.vercel.app"}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined) ??
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
