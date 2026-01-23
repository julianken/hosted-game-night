import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@beak-gaming/ui',
    '@beak-gaming/theme',
    '@beak-gaming/auth',
  ],
  // Configure API route body size limits
  // This prevents DoS attacks via large request payloads
  experimental: {
    // bodyParser config is now a top-level property in Next.js 16
    // We configure it at the route level via route handlers
  },
};

// Bundle analyzer is enabled via ANALYZE=true environment variable
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withAnalyzer(nextConfig);
