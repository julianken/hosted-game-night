import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['@joolie-boolie/testing/setup'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', 'src/**/__tests__/**', 'src/**/index.ts'],
      thresholds: {
        statements: 58,
        branches: 65,
        functions: 66,
        lines: 58,
      },
    },
  },
});
