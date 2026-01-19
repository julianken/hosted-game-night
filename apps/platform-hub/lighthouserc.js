/**
 * Lighthouse CI Configuration - Platform Hub
 *
 * App-specific Lighthouse configuration for the Platform Hub.
 * Hub is the entry point, so performance is critical for first impressions.
 *
 * Usage:
 *   pnpm lighthouse:hub
 *   # or from monorepo root:
 *   pnpm --filter @beak-gaming/platform-hub lighthouse
 */

const path = require('path');
const performanceConfig = require('../../performance.config.js');

// Merge app-specific overrides
const appConfig = performanceConfig.apps['platform-hub'] || {};
const lighthouseScores = { ...performanceConfig.lighthouse, ...appConfig.lighthouse };

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,

      // Build and start the platform hub
      startServerCommand: 'pnpm build && pnpm start',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 60000,

      // Test all critical paths
      url: [
        'http://localhost:3002/',              // Home/game selector
        'http://localhost:3002/auth/login',    // Login page
      ],

      settings: {
        // Test both desktop and mobile (hub may be accessed from tablets)
        preset: 'desktop',

        chromeFlags: '--no-sandbox --headless --disable-gpu',

        onlyCategories: [
          'performance',
          'accessibility',
          'best-practices',
          'seo',
        ],

        skipAudits: ['is-on-https'],

        // Hub should work well even on slower connections
        throttling: {
          cpuSlowdownMultiplier: 2,
          downloadThroughputKbps: 5120,  // 5 Mbps (slower for hub)
          uploadThroughputKbps: 2560,    // 2.5 Mbps
          rttMs: 60,
        },
      },
    },

    assert: {
      assertions: {
        // Core Web Vitals - Hub should be fast
        'largest-contentful-paint': [
          'error', // Hub is simple, should be fast
          { maxNumericValue: performanceConfig.coreWebVitals.lcp.budget },
        ],
        'first-contentful-paint': [
          'error',
          { maxNumericValue: performanceConfig.coreWebVitals.fcp.budget },
        ],
        'cumulative-layout-shift': [
          'error',
          { maxNumericValue: performanceConfig.coreWebVitals.cls.budget },
        ],
        'total-blocking-time': [
          'warn',
          { maxNumericValue: performanceConfig.coreWebVitals.tbt.budget },
        ],

        // Lighthouse category scores - Hub should score high
        'categories:performance': [
          'warn',
          { minScore: lighthouseScores.performance / 100 },
        ],
        'categories:accessibility': [
          'error',
          { minScore: lighthouseScores.accessibility / 100 },
        ],
        'categories:best-practices': [
          'warn',
          { minScore: lighthouseScores.bestPractices / 100 },
        ],
        'categories:seo': [
          'warn',
          { minScore: lighthouseScores.seo / 100 },
        ],

        // Accessibility audits
        'color-contrast': 'error',
        'tap-targets': 'error',
        'font-size': 'error',

        // Performance optimizations
        'uses-responsive-images': 'warn',
        'uses-text-compression': 'warn',
        'render-blocking-resources': 'warn',
        'unused-javascript': 'warn',
      },
    },

    upload: {
      target: 'filesystem',
      outputDir: path.join(__dirname, '.lighthouseci'),
    },
  },
};
