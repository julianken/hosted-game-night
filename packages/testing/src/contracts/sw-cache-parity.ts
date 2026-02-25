/**
 * Service Worker Cache Parity Contract
 *
 * Ensures that the SW cache preloading hook return value matches the
 * expected state across both Bingo and Trivia apps. This contract catches
 * behavioral regressions introduced when apps copy-diverge from shared
 * service worker cache logic.
 *
 * @module contracts/sw-cache-parity
 */

import { expect } from 'vitest';

export interface SwCacheParityState {
  isPreloading: boolean;
  cacheStatus: 'idle' | 'preloading' | 'complete' | 'error';
}

/**
 * Assert that an SW cache hook's return value matches the expected state.
 *
 * Use this in both Bingo and Trivia test suites to guarantee that the
 * cache preloading behavior stays consistent across apps.
 *
 * @param hookReturnValue - The value returned by the app's useSwCache hook
 * @param expectedState - The expected cache state
 */
export function assertSwCacheParityCompliance(
  hookReturnValue: SwCacheParityState,
  expectedState: { isPreloading: boolean; cacheStatus: string }
): void {
  expect(hookReturnValue.isPreloading).toBe(expectedState.isPreloading);
  expect(hookReturnValue.cacheStatus).toBe(expectedState.cacheStatus);
}
