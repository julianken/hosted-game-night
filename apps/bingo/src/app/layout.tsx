import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { ErrorBoundaryProvider } from "@/components/providers/ErrorBoundaryProvider";
import { SentryClientInit } from "@/components/providers/SentryClientInit";
import { ToastProvider } from "@joolie-boolie/ui";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bingo",
  description: "Cloud-based Bingo system for groups and communities",
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
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundaryProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundaryProvider>
        <ServiceWorkerRegistration />
        <SentryClientInit />
      </body>
    </html>
  );
}
