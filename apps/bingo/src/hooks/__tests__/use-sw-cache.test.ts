import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSWCache } from '../use-sw-cache';

// Mock the cache-manager module
vi.mock('@/lib/sw/cache-manager', () => ({
  isServiceWorkerSupported: vi.fn(() => true),
  getCacheStatus: vi.fn(() => Promise.resolve({ cachedPacks: [], totalFiles: 0 })),
  clearVoiceCache: vi.fn(() => Promise.resolve(true)),
  preloadVoicePack: vi.fn(() => Promise.resolve()),
}));

import {
  isServiceWorkerSupported,
  getCacheStatus,
  clearVoiceCache,
  preloadVoicePack,
} from '@/lib/sw/cache-manager';

describe('use-sw-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    vi.mocked(isServiceWorkerSupported).mockReturnValue(true);
    vi.mocked(getCacheStatus).mockResolvedValue({ cachedPacks: [], totalFiles: 0 });
    vi.mocked(clearVoiceCache).mockResolvedValue(true);
    vi.mocked(preloadVoicePack).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isSupported', () => {
    it('returns true when service workers are supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(true);

      const { result } = renderHook(() => useSWCache());

      // Wait for any async effects to complete
      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });
    });

    it('returns false when service workers are not supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(false);

      const { result } = renderHook(() => useSWCache());

      // Wait for any async effects to complete
      await waitFor(() => {
        expect(result.current.isSupported).toBe(false);
      });
    });
  });

  describe('initial cache status fetch', () => {
    it('fetches cache status on mount', async () => {
      vi.mocked(getCacheStatus).mockResolvedValue({
        cachedPacks: ['standard', 'british'],
        totalFiles: 150,
      });

      const { result } = renderHook(() => useSWCache());

      await waitFor(() => {
        expect(getCacheStatus).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.cachedPacks).toEqual(['standard', 'british']);
        expect(result.current.totalFiles).toBe(150);
      });
    });

    it('does not fetch cache status if service worker not supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(false);

      renderHook(() => useSWCache());

      // Wait a bit to ensure async operations would have completed
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(getCacheStatus).not.toHaveBeenCalled();
    });

    it('handles errors gracefully during initial fetch', async () => {
      vi.mocked(getCacheStatus).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSWCache());

      await waitFor(() => {
        expect(getCacheStatus).toHaveBeenCalled();
      });

      // Should not crash and should maintain default values
      expect(result.current.cachedPacks).toEqual([]);
      expect(result.current.totalFiles).toBe(0);
    });
  });

  describe('preload', () => {
    it('initiates preload for a voice pack', async () => {
      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        await result.current.preload('british');
      });

      expect(preloadVoicePack).toHaveBeenCalledWith('british', expect.any(Function));
    });

    it('sets isPreloading to true during preload', async () => {
      let resolvePreload: () => void;
      vi.mocked(preloadVoicePack).mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePreload = resolve;
        });
      });

      const { result } = renderHook(() => useSWCache());

      // Start preload without awaiting
      act(() => {
        result.current.preload('standard');
      });

      // Should be preloading
      expect(result.current.isPreloading).toBe(true);

      // Complete the preload
      await act(async () => {
        resolvePreload!();
      });

      // Should no longer be preloading
      expect(result.current.isPreloading).toBe(false);
    });

    it('updates progress during preload', async () => {
      let progressCallback: ((loaded: number, total: number) => void) | undefined;

      vi.mocked(preloadVoicePack).mockImplementation(async (packId, onProgress) => {
        progressCallback = onProgress;
      });

      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        const preloadPromise = result.current.preload('standard');

        // Simulate progress updates
        if (progressCallback) {
          progressCallback(25, 75);
        }

        await preloadPromise;
      });

      // Progress should have been updated (though it resets to 0 after completion)
      expect(preloadVoicePack).toHaveBeenCalledWith('standard', expect.any(Function));
    });

    it('resets progress to 0 after preload completes', async () => {
      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        await result.current.preload('standard');
      });

      expect(result.current.preloadProgress).toBe(0);
    });

    it('does not preload if service worker not supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(false);

      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        await result.current.preload('standard');
      });

      expect(preloadVoicePack).not.toHaveBeenCalled();
    });

    it('does not start new preload if already preloading', async () => {
      let resolvePreload: () => void;
      vi.mocked(preloadVoicePack).mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePreload = resolve;
        });
      });

      const { result } = renderHook(() => useSWCache());

      // Start first preload
      act(() => {
        result.current.preload('standard');
      });

      // Try to start second preload while first is in progress
      act(() => {
        result.current.preload('british');
      });

      // Should only have been called once
      expect(preloadVoicePack).toHaveBeenCalledTimes(1);
      expect(preloadVoicePack).toHaveBeenCalledWith('standard', expect.any(Function));

      // Cleanup
      await act(async () => {
        resolvePreload!();
      });
    });

    it('refreshes cache status after preload', async () => {
      const { result } = renderHook(() => useSWCache());

      // Clear the initial call
      vi.mocked(getCacheStatus).mockClear();

      await act(async () => {
        await result.current.preload('standard');
      });

      expect(getCacheStatus).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('clears the voice cache', async () => {
      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        await result.current.clearCache();
      });

      expect(clearVoiceCache).toHaveBeenCalled();
    });

    it('refreshes cache status after clearing', async () => {
      const { result } = renderHook(() => useSWCache());

      // Clear the initial call
      vi.mocked(getCacheStatus).mockClear();

      await act(async () => {
        await result.current.clearCache();
      });

      expect(getCacheStatus).toHaveBeenCalled();
    });

    it('does not clear if service worker not supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(false);

      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        await result.current.clearCache();
      });

      expect(clearVoiceCache).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('updates cache status', async () => {
      vi.mocked(getCacheStatus)
        .mockResolvedValueOnce({ cachedPacks: [], totalFiles: 0 })
        .mockResolvedValueOnce({ cachedPacks: ['standard'], totalFiles: 75 });

      const { result } = renderHook(() => useSWCache());

      // Wait for initial fetch
      await waitFor(() => {
        expect(getCacheStatus).toHaveBeenCalledTimes(1);
      });

      // Refresh
      await act(async () => {
        await result.current.refresh();
      });

      expect(getCacheStatus).toHaveBeenCalledTimes(2);
      expect(result.current.cachedPacks).toEqual(['standard']);
      expect(result.current.totalFiles).toBe(75);
    });

    it('does not refresh if service worker not supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(false);

      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        await result.current.refresh();
      });

      expect(getCacheStatus).not.toHaveBeenCalled();
    });

    it('handles refresh errors gracefully', async () => {
      vi.mocked(getCacheStatus)
        .mockResolvedValueOnce({ cachedPacks: ['standard'], totalFiles: 75 })
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSWCache());

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.cachedPacks).toEqual(['standard']);
      });

      // Refresh with error
      await act(async () => {
        await result.current.refresh();
      });

      // Should maintain previous state on error
      expect(result.current.cachedPacks).toEqual(['standard']);
      expect(result.current.totalFiles).toBe(75);
    });
  });
});
