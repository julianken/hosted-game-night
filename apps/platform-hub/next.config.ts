import type { NextConfig } from 'next';
import { withSerwist } from '@serwist/turbopack';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  serverExternalPackages: ["esbuild-wasm"],
  transpilePackages: [
    '@beak-gaming/ui',
    '@beak-gaming/theme',
    '@beak-gaming/auth',
    '@beak-gaming/database',
  ],
  // Note: Request body size limits are enforced via middleware.ts
  // using Content-Length header inspection, not Next.js bodyParser config
  turbopack: {
    resolveAlias: {
      '@beak-gaming/database/api': '../../packages/database/src/api/index.ts',
      '@beak-gaming/database/tables':
        '../../packages/database/src/tables/index.ts',
    },
  },
  async rewrites() {
    return [
      { source: '/sw.js', destination: '/serwist/sw.js' },
      { source: '/sw.js.map', destination: '/serwist/sw.js.map' },
    ];
  },
};

// Bundle analyzer is enabled via ANALYZE=true environment variable
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withAnalyzer(withSerwist(nextConfig));
