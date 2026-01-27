/**
 * Debounced localStorage writer for offline session persistence.
 */

import { serializeBingoState, SerializedBingoState } from './serializer';
import { GameState } from '@/types';

const DEBOUNCE_DELAY_MS = 30_000;
const STORAGE_KEY_PREFIX = 'bingo_offline_session_';

interface OfflineSessionData {
  sessionId: string;
  isOffline: true;
  gameState: SerializedBingoState;
  createdAt: string;
  lastUpdated: string;
}

interface DebouncedStorageWriter {
  scheduleWrite: (sessionId: string, gameState: GameState) => void;
  flush: () => void;
  cleanup: () => void;
}

export function createDebouncedStorageWriter(): DebouncedStorageWriter {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingWrite: { sessionId: string; gameState: GameState } | null = null;
  const createdAtCache: Map<string, string> = new Map();

  function writeToStorage(sessionId: string, gameState: GameState): void {
    try {
      const sessionKey = STORAGE_KEY_PREFIX + sessionId;
      let createdAt = createdAtCache.get(sessionId);
      if (!createdAt) {
        try {
          const existing = localStorage.getItem(sessionKey);
          if (existing) {
            const existingData = JSON.parse(existing) as OfflineSessionData;
            if (existingData.createdAt) {
              createdAt = existingData.createdAt;
              createdAtCache.set(sessionId, createdAt);
            }
          }
        } catch { /* Ignore parse errors */ }
      }
      if (!createdAt) {
        createdAt = new Date().toISOString();
        createdAtCache.set(sessionId, createdAt);
      }
      const sessionData: OfflineSessionData = {
        sessionId,
        isOffline: true,
        gameState: serializeBingoState(gameState),
        createdAt,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to save offline session:', error);
    }
  }

  function flush(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (pendingWrite !== null) {
      writeToStorage(pendingWrite.sessionId, pendingWrite.gameState);
      pendingWrite = null;
    }
  }

  function scheduleWrite(sessionId: string, gameState: GameState): void {
    pendingWrite = { sessionId, gameState };
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => flush(), DEBOUNCE_DELAY_MS);
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') flush();
  }

  function handleBeforeUnload(): void { flush(); }

  if (typeof window !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  function cleanup(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingWrite = null;
    createdAtCache.clear();
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }

  return { scheduleWrite, flush, cleanup };
}

export function createOfflineSession(sessionId: string, gameState: GameState): void {
  try {
    const sessionKey = STORAGE_KEY_PREFIX + sessionId;
    const now = new Date().toISOString();
    const sessionData: OfflineSessionData = {
      sessionId,
      isOffline: true,
      gameState: serializeBingoState(gameState),
      createdAt: now,
      lastUpdated: now,
    };
    localStorage.setItem(sessionKey, JSON.stringify(sessionData));
  } catch (error) {
    console.error('Failed to create offline session:', error);
  }
}
