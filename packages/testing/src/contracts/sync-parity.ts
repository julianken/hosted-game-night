/**
 * Sync Parity Contract
 *
 * Ensures that the sync hook return value matches the underlying store state
 * across both Bingo and Trivia apps. This contract catches behavioral
 * regressions introduced when apps copy-diverge from shared sync logic.
 *
 * @module contracts/sync-parity
 */

import { expect } from 'vitest';

export interface SyncParityState {
  isConnected: boolean;
  lastSyncTimestamp: number | null;
  connectionError: string | null;
}

/**
 * Assert that a sync hook's return value matches the expected store state.
 *
 * Use this in both Bingo and Trivia test suites to guarantee that the
 * hook-to-store mapping stays consistent across apps.
 *
 * @param hookReturnValue - The value returned by the app's useSync hook
 * @param storeState - The expected state from the underlying Zustand store
 */
export function assertSyncParityCompliance(
  hookReturnValue: SyncParityState,
  storeState: {
    isConnected: boolean;
    lastSyncTimestamp: number | null;
    connectionError: string | null;
  }
): void {
  expect(hookReturnValue.isConnected).toBe(storeState.isConnected);
  expect(hookReturnValue.lastSyncTimestamp).toBe(storeState.lastSyncTimestamp);
  expect(hookReturnValue.connectionError).toBe(storeState.connectionError);
}
