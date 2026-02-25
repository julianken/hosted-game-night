import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', '**/index.ts', '**/__tests__/**'],
      thresholds: {
        statements: 38,
        branches: 28,
        functions: 34,
        lines: 38,
      },
    },
  },
});
