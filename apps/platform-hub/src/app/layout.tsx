import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Header, Footer } from '@/components';
import { ErrorBoundaryProvider } from '@/components/providers/ErrorBoundaryProvider';
import { AuthProvider } from '@beak-gaming/auth';
import { ToastProvider } from '@beak-gaming/ui';
import { validateEnvironment } from '@/lib/env-validation';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { ThemeInitializer } from '@/components/ThemeInitializer';

// Validate environment variables at startup
// This will throw and prevent the app from starting if configuration is invalid
// Skip validation during build phase (NEXT_PHASE is set by Next.js during builds)
if (process.env.NEXT_PHASE !== 'phase-production-build') {
  validateEnvironment();
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Beak Gaming Platform',
  description:
    'Fun, accessible games designed for retirement communities - Bingo, Trivia, and more',
  keywords: ['bingo', 'trivia', 'games', 'retirement', 'senior', 'accessible'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Beak Gaming Platform',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Beak Gaming Platform',
    description: 'Fun, accessible games designed for retirement communities',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
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
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeInitializer />
        <ErrorBoundaryProvider>
          <AuthProvider>
            <ToastProvider position="top-right">
              <Header />
              <div className="flex-1 flex flex-col">{children}</div>
              <Footer />
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundaryProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
