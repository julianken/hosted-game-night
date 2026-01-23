import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

/**
 * Maximum request body size in MB (default: 1MB)
 * Can be overridden via MAX_BODY_SIZE_MB environment variable
 */
const MAX_BODY_SIZE_MB = parseInt(
  process.env.MAX_BODY_SIZE_MB || '1',
  10
);

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
  // Server runtime config for API routes
  serverRuntimeConfig: {
    maxRequestBodySize: MAX_BODY_SIZE_MB * 1024 * 1024, // Convert MB to bytes
  },
};

// Bundle analyzer is enabled via ANALYZE=true environment variable
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withAnalyzer(nextConfig);
