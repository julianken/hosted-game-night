/**
 * Performance Budget Configuration
 *
 * Defines maximum bundle sizes and Core Web Vitals targets for the Joolie Boolie.
 * These budgets are designed for accessible applications that need to load quickly
 * on potentially slower connections in group and community environments.
 *
 * Usage:
 * - Lighthouse CI uses these budgets during CI checks
 * - Bundle analyzer compares against these limits
 * - Run `pnpm analyze` to visualize bundle sizes
 */

const performanceConfig = {
  // Bundle size budgets (in bytes)
  // These are conservative limits suitable for PWAs on slower networks
  bundles: {
    // Maximum size for JavaScript bundles
    javascript: {
      // First-load JS (shared chunks + page-specific JS)
      firstLoad: 200 * 1024, // 200KB
      // Individual chunk warning threshold
      chunkWarning: 100 * 1024, // 100KB
      // Individual chunk error threshold
      chunkError: 250 * 1024, // 250KB
      // Total JS budget per route
      routeTotal: 350 * 1024, // 350KB
    },
    // Maximum size for CSS bundles
    css: {
      // Total CSS budget
      total: 50 * 1024, // 50KB
      // Individual file warning
      fileWarning: 30 * 1024, // 30KB
    },
    // Image optimization targets
    images: {
      // LCP image should be under this size
      lcpImage: 150 * 1024, // 150KB
      // Hero images
      hero: 200 * 1024, // 200KB
    },
  },

  // Core Web Vitals targets
  // Based on Google's "good" thresholds with some margin for safety
  coreWebVitals: {
    // Largest Contentful Paint (LCP)
    // Measures loading performance - should occur within 2.5s
    lcp: {
      good: 2500, // 2.5 seconds
      needsImprovement: 4000, // 4 seconds
      // Budget: aim for well under "good" threshold
      budget: 2000, // 2 seconds
    },

    // First Input Delay (FID) / Interaction to Next Paint (INP)
    // Measures interactivity - should be under 100ms
    fid: {
      good: 100, // 100ms
      needsImprovement: 300, // 300ms
      budget: 50, // 50ms
    },

    // Interaction to Next Paint (INP) - replacing FID in March 2024
    // Measures responsiveness throughout the page lifecycle
    inp: {
      good: 200, // 200ms
      needsImprovement: 500, // 500ms
      budget: 150, // 150ms
    },

    // Cumulative Layout Shift (CLS)
    // Measures visual stability - should be under 0.1
    cls: {
      good: 0.1,
      needsImprovement: 0.25,
      budget: 0.05, // Very low - important for users
    },

    // First Contentful Paint (FCP)
    // When first content appears
    fcp: {
      good: 1800, // 1.8 seconds
      needsImprovement: 3000, // 3 seconds
      budget: 1500, // 1.5 seconds
    },

    // Time to First Byte (TTFB)
    // Server response time
    ttfb: {
      good: 800, // 800ms
      needsImprovement: 1800, // 1.8 seconds
      budget: 500, // 500ms
    },

    // Total Blocking Time (TBT)
    // Lab metric approximating FID
    tbt: {
      good: 200, // 200ms
      needsImprovement: 600, // 600ms
      budget: 150, // 150ms
    },

    // Speed Index
    // How quickly content is visually displayed
    speedIndex: {
      good: 3400, // 3.4 seconds
      needsImprovement: 5800, // 5.8 seconds
      budget: 2500, // 2.5 seconds
    },
  },

  // Lighthouse score targets
  lighthouse: {
    performance: 90,
    accessibility: 95, // High accessibility for users
    bestPractices: 90,
    seo: 90,
  },

  // App-specific overrides
  apps: {
    bingo: {
      // Bingo has more assets (audio, patterns)
      bundles: {
        javascript: {
          routeTotal: 400 * 1024, // 400KB
        },
      },
      lighthouse: {
        performance: 85, // Audio/visual features may impact score
      },
    },
    trivia: {
      // Trivia is similar to bingo
      bundles: {
        javascript: {
          routeTotal: 400 * 1024, // 400KB
        },
      },
    },
    'platform-hub': {
      // Hub should be lighter
      bundles: {
        javascript: {
          routeTotal: 300 * 1024, // 300KB
        },
      },
      lighthouse: {
        performance: 95, // Simple app should score high
      },
    },
  },
};

// Export for use in various tools
module.exports = performanceConfig;

// Also export individual sections for convenience
module.exports.bundles = performanceConfig.bundles;
module.exports.coreWebVitals = performanceConfig.coreWebVitals;
module.exports.lighthouse = performanceConfig.lighthouse;
module.exports.apps = performanceConfig.apps;
