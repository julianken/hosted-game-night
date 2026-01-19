import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Header, Footer } from '@/components';
import { ErrorBoundaryProvider } from '@/components/providers/ErrorBoundaryProvider';

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
  description: 'Fun, accessible games designed for retirement communities - Bingo, Trivia, and more',
  keywords: ['bingo', 'trivia', 'games', 'retirement', 'senior', 'accessible'],
  openGraph: {
    title: 'Beak Gaming Platform',
    description: 'Fun, accessible games designed for retirement communities',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ErrorBoundaryProvider>
          <Header />
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <Footer />
        </ErrorBoundaryProvider>
      </body>
    </html>
  );
}
