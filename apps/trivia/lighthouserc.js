/**
 * Lighthouse CI Configuration - Trivia App
 *
 * App-specific Lighthouse configuration for Trivia Night.
 * Tests all critical user paths including presenter and audience views.
 *
 * Usage:
 *   pnpm lighthouse:trivia
 *   # or from monorepo root:
 *   pnpm --filter @beak-gaming/trivia lighthouse
 */

const path = require('path');
const performanceConfig = require('../../performance.config.js');

// Merge app-specific overrides
const appConfig = performanceConfig.apps.trivia || {};
const lighthouseScores = { ...performanceConfig.lighthouse, ...appConfig.lighthouse };

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,

      // Build and start the trivia app
      startServerCommand: 'pnpm build && pnpm start',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 60000,

      // Test all critical paths
      url: [
        'http://localhost:3001/',         // Home page
        'http://localhost:3001/play',     // Presenter view
        'http://localhost:3001/display',  // Audience view
      ],

      settings: {
        // Test desktop primarily (projector/large screen use case)
        preset: 'desktop',

        chromeFlags: '--no-sandbox --headless --disable-gpu',

        onlyCategories: [
          'performance',
          'accessibility',
          'best-practices',
          'seo',
        ],

        skipAudits: ['is-on-https'],

        // Throttling settings for realistic testing
        throttling: {
          cpuSlowdownMultiplier: 2,
          downloadThroughputKbps: 10240, // 10 Mbps
          uploadThroughputKbps: 5120,    // 5 Mbps
          rttMs: 40,
        },
      },
    },

    assert: {
      assertions: {
        // Core Web Vitals with app-specific budgets
        'largest-contentful-paint': [
          'warn',
          { maxNumericValue: performanceConfig.coreWebVitals.lcp.budget },
        ],
        'first-contentful-paint': [
          'warn',
          { maxNumericValue: performanceConfig.coreWebVitals.fcp.budget },
        ],
        'cumulative-layout-shift': [
          'error', // CLS is critical for question display
          { maxNumericValue: performanceConfig.coreWebVitals.cls.budget },
        ],
        'total-blocking-time': [
          'warn',
          { maxNumericValue: performanceConfig.coreWebVitals.tbt.budget },
        ],

        // Lighthouse category scores
        'categories:performance': [
          'warn',
          { minScore: lighthouseScores.performance / 100 },
        ],
        'categories:accessibility': [
          'error', // Accessibility is critical for senior users
          { minScore: lighthouseScores.accessibility / 100 },
        ],
        'categories:best-practices': [
          'warn',
          { minScore: lighthouseScores.bestPractices / 100 },
        ],

        // Accessibility audits (critical for senior users)
        'color-contrast': 'error',
        'tap-targets': 'error',
        'font-size': 'error', // Large fonts are required

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
