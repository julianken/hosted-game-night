import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts'],
      thresholds: {
        statements: 8,
        branches: 25,
        functions: 3,
        lines: 9,
      },
    },
  },
});
