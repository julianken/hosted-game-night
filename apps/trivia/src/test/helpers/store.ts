import { useGameStore } from '@/stores/game-store';
import { useSyncStore } from '@/stores/sync-store';
import { createInitialState } from '@/lib/game/engine';

/**
 * Reset the game store to initial state
 */
export function resetGameStore(): void {
  useGameStore.setState(createInitialState());
}

/**
 * Reset the sync store to initial state
 */
export function resetSyncStore(): void {
  useSyncStore.getState().reset();
}

/**
 * Reset all stores to initial state
 */
export function resetAllStores(): void {
  resetGameStore();
  resetSyncStore();
}
