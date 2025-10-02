import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ThankATech - Appreciate Your Local Technicians",
  description: "Connect with skilled technicians in your area. Thank them, reward them with TOA tokens, and support the people who keep our world running.",
  keywords: "technicians, local services, thank you, TOA tokens, appreciation, skilled workers, token rewards",
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.svg', sizes: '16x16', type: 'image/svg+xml' }
    ],
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.svg',
  },
  openGraph: {
    title: "ThankATech - Appreciate Your Local Technicians",
    description: "Connect with skilled technicians in your area. Thank them, reward them with TOA tokens, and support the people who keep our world running.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ThankATech - Appreciate Your Local Technicians",
    description: "Connect with skilled technicians in your area. Thank them, reward them with TOA tokens, and support the people who keep our world running.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#2563EB" />
        <meta name="msapplication-TileColor" content="#2563EB" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          fontFamily: `var(--font-geist-sans), "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Emoji", sans-serif`
        }}
      >
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}




