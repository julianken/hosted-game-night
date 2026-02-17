import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "esbuild-wasm",
    "@opentelemetry/api",
    "@opentelemetry/sdk-trace-base",
    "@opentelemetry/exporter-trace-otlp-http",
    "@opentelemetry/resources",
    "@opentelemetry/semantic-conventions",
  ],
  productionBrowserSourceMaps: false,
  transpilePackages: [
    '@joolie-boolie/sync',
    '@joolie-boolie/ui',
    '@joolie-boolie/theme',
    '@joolie-boolie/auth',
    '@joolie-boolie/database',
  ],
  turbopack: {
    resolveAlias: {
      '@joolie-boolie/database/api': '../../packages/database/src/api/index.ts',
      '@joolie-boolie/database/tables': '../../packages/database/src/tables/index.ts',
    },
  },
async rewrites() {
    return [
      { source: "/sw.js", destination: "/serwist/sw.js" },
      { source: "/sw.js.map", destination: "/serwist/sw.js.map" },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
};

// Bundle analyzer is enabled via ANALYZE=true environment variable
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withAnalyzer(withSerwist(nextConfig));
