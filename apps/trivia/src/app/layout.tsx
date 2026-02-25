import type { Metadata, Viewport } from 'next';
import { Geist_Mono } from 'next/font/google';
import { fontDisplay, fontSans } from '@joolie-boolie/theme';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { ErrorBoundaryProvider } from '@/components/providers/ErrorBoundaryProvider';
import { SentryClientInit } from '@/components/providers/SentryClientInit';
import { FaroInit } from '@/components/providers/FaroInit';
import { ToastProvider } from "@joolie-boolie/ui";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Trivia - Joolie Boolie',
  description: 'Presenter-controlled trivia for groups and communities',
  icons: {
    apple: '/icons/icon-192.svg',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Trivia',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#7E52E4',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontSans.variable} ${geistMono.variable}`}>
      <head />
      <body className="antialiased">
        <ToastProvider>
          <ErrorBoundaryProvider>
            {children}
          </ErrorBoundaryProvider>
        </ToastProvider>
        <ServiceWorkerRegistration />
        <SentryClientInit />
        <FaroInit />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
