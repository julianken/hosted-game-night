import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@beak-gaming/ui',
    '@beak-gaming/theme',
    '@beak-gaming/auth',
  ],
};

// Bundle analyzer is enabled via ANALYZE=true environment variable
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withAnalyzer(nextConfig);
