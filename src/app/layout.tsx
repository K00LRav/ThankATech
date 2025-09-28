import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from '@vercel/speed-insights/next';
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
  description: "Connect with skilled technicians in your area. Thank them, tip them, and support the people who keep our world running.",
  keywords: "technicians, local services, thank you, tips, appreciation, skilled workers",
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
    description: "Connect with skilled technicians in your area. Thank them, tip them, and support the people who keep our world running.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ThankATech - Appreciate Your Local Technicians",
    description: "Connect with skilled technicians in your area. Thank them, tip them, and support the people who keep our world running.",
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
        <meta name="theme-color" content="#2563EB" />
        <meta name="msapplication-TileColor" content="#2563EB" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}




