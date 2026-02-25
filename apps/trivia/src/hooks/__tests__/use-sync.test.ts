import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { create } from 'zustand';

// Mock @/stores/theme-store to avoid importing @joolie-boolie/theme
// which pulls in next/font/google (unavailable in test environment)
vi.mock('@/stores/theme-store', () => {
  type ThemeMode = 'light' | 'dark' | 'system';
  interface ThemeStore {
    presenterTheme: ThemeMode;
    displayTheme: ThemeMode;
    setPresenterTheme: (theme: ThemeMode) => void;
    setDisplayTheme: (theme: ThemeMode) => void;
  }
  const useThemeStore = create<ThemeStore>()((set) => ({
    presenterTheme: 'system',
    displayTheme: 'system',
    setPresenterTheme: (theme: ThemeMode) => set({ presenterTheme: theme }),
    setDisplayTheme: (theme: ThemeMode) => set({ displayTheme: theme }),
  }));
  return {
    useThemeStore,
    DEFAULT_THEME: 'system',
    THEME_OPTIONS: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'system', label: 'System Default' },
    ],
  };
});

import { useSync, createMessageRouter } from '../use-sync';
import { useSyncStore } from '@joolie-boolie/sync';
import { assertSyncParityCompliance } from '@joolie-boolie/testing/contracts';
import type { TriviaSyncMessage } from '@/types';

// Test session ID for all tests
const TEST_SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  close = vi.fn();

  constructor(name: string) {
    this.name = name;
  }
}

describe('use-sync (trivia)', () => {
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

    // Reset sync store before each test
    useSyncStore.getState().reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('presenter role', () => {
    it('initializes sync store with presenter role', () => {
      renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      expect(useSyncStore.getState().role).toBe('presenter');
    });

    it('provides broadcastState function', () => {
      const { result } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      expect(typeof result.current.broadcastState).toBe('function');
    });

    it('provides requestSync function', () => {
      const { result } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      expect(typeof result.current.requestSync).toBe('function');
    });
  });

  describe('audience role', () => {
    it('initializes sync store with audience role', () => {
      renderHook(() => useSync({ role: 'audience', sessionId: TEST_SESSION_ID }));

      expect(useSyncStore.getState().role).toBe('audience');
    });
  });

  describe('parity contract — hook return values reflect store state', () => {
    it('isConnected matches store after initialization', () => {
      const { result } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      assertSyncParityCompliance(
        {
          isConnected: result.current.isConnected,
          lastSyncTimestamp: result.current.lastSyncTimestamp,
          connectionError: result.current.connectionError,
        },
        {
          isConnected: useSyncStore.getState().isConnected,
          lastSyncTimestamp: useSyncStore.getState().lastSyncTimestamp,
          connectionError: useSyncStore.getState().connectionError,
        }
      );
    });

    it('isConnected is true from store (not hardcoded) after successful init', () => {
      const { result } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      // Store should be set to connected
      expect(useSyncStore.getState().isConnected).toBe(true);
      // Hook return value must reflect the store — NOT a hardcoded literal
      expect(result.current.isConnected).toBe(true);
    });

    it('isConnected is false from store when BroadcastChannel is unavailable', () => {
      vi.stubGlobal('BroadcastChannel', undefined);

      const { result } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      // Store should reflect disconnected state
      expect(useSyncStore.getState().isConnected).toBe(false);
      // Hook return value must match store
      expect(result.current.isConnected).toBe(false);
    });

    it('connectionError matches store when initialization fails', () => {
      vi.stubGlobal('BroadcastChannel', undefined);

      const { result } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      assertSyncParityCompliance(
        {
          isConnected: result.current.isConnected,
          lastSyncTimestamp: result.current.lastSyncTimestamp,
          connectionError: result.current.connectionError,
        },
        {
          isConnected: useSyncStore.getState().isConnected,
          lastSyncTimestamp: useSyncStore.getState().lastSyncTimestamp,
          connectionError: useSyncStore.getState().connectionError,
        }
      );
    });

    it('lastSyncTimestamp matches store initially (null)', () => {
      const { result } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      assertSyncParityCompliance(
        {
          isConnected: result.current.isConnected,
          lastSyncTimestamp: result.current.lastSyncTimestamp,
          connectionError: result.current.connectionError,
        },
        {
          isConnected: useSyncStore.getState().isConnected,
          lastSyncTimestamp: useSyncStore.getState().lastSyncTimestamp,
          connectionError: useSyncStore.getState().connectionError,
        }
      );
    });
  });

  describe('cleanup', () => {
    it('resets sync store on unmount', () => {
      const { unmount } = renderHook(() => useSync({ role: 'presenter', sessionId: TEST_SESSION_ID }));

      expect(useSyncStore.getState().isConnected).toBe(true);

      unmount();

      expect(useSyncStore.getState().isConnected).toBe(false);
      expect(useSyncStore.getState().role).toBeNull();
    });
  });

  describe('createMessageRouter', () => {
    it('routes STATE_UPDATE to onStateUpdate', () => {
      const onStateUpdate = vi.fn();
      const router = createMessageRouter({ onStateUpdate });

      router({
        type: 'STATE_UPDATE',
        payload: { status: 'setup' } as unknown as import('@/types').TriviaGameState,
        timestamp: Date.now(),
      } as TriviaSyncMessage);

      expect(onStateUpdate).toHaveBeenCalled();
    });

    it('routes REQUEST_SYNC to onSyncRequest', () => {
      const onSyncRequest = vi.fn();
      const router = createMessageRouter({ onSyncRequest });

      router({
        type: 'REQUEST_SYNC',
        payload: null,
        timestamp: Date.now(),
      });

      expect(onSyncRequest).toHaveBeenCalled();
    });

    it('routes CHANNEL_READY to onChannelReady', () => {
      const onChannelReady = vi.fn();
      const router = createMessageRouter({ onChannelReady });

      router({
        type: 'CHANNEL_READY',
        payload: null,
        timestamp: Date.now(),
      });

      expect(onChannelReady).toHaveBeenCalled();
    });

    it('routes DISPLAY_THEME_CHANGED to onDisplayThemeChanged', () => {
      const onDisplayThemeChanged = vi.fn();
      const router = createMessageRouter({ onDisplayThemeChanged });

      router({
        type: 'DISPLAY_THEME_CHANGED',
        payload: { theme: 'dark' },
        timestamp: Date.now(),
      });

      expect(onDisplayThemeChanged).toHaveBeenCalledWith('dark');
    });
  });

  describe('sessionId guard', () => {
    it('does not initialize when sessionId is empty string', () => {
      renderHook(() => useSync({ role: 'presenter', sessionId: '' }));

      // Without a session ID, initialization should be skipped
      expect(useSyncStore.getState().isConnected).toBe(false);
    });
  });

  describe('audience sync-store update', () => {
    it('sets connected=true in store for audience role after init', () => {
      renderHook(() => useSync({ role: 'audience', sessionId: TEST_SESSION_ID }));

      expect(useSyncStore.getState().isConnected).toBe(true);
    });
  });
});
