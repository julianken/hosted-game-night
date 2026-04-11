import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { fontDisplay, fontSans } from "@joolie-boolie/theme";
import "./globals.css";
import { ServiceWorkerRegistration } from "@joolie-boolie/ui";
import { ErrorBoundaryProvider } from "@/components/providers/ErrorBoundaryProvider";
import { SentryClientInit } from "@/components/providers/SentryClientInit";
import { FaroInit } from "@joolie-boolie/error-tracking/components";
import { ToastProvider } from "@joolie-boolie/ui";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bingo",
  description: "A modern, browser-based bingo system for groups and communities",
  icons: {
    apple: "/icons/icon-192.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bingo",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#3B82F6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontSans.variable}`}>
      <head />
      <body
        className={`${geistMono.variable} antialiased`}
      >
        <ErrorBoundaryProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundaryProvider>
        <ServiceWorkerRegistration appName="Bingo" />
        <SentryClientInit />
        <FaroInit appName="bingo" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
