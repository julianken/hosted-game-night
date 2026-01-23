import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@beak-gaming/ui',
    '@beak-gaming/theme',
    '@beak-gaming/auth',
  ],
  // Note: Request body size limits are enforced via middleware.ts
  // using Content-Length header inspection, not Next.js bodyParser config
};

// Bundle analyzer is enabled via ANALYZE=true environment variable
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withAnalyzer(nextConfig);
