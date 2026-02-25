import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { assertSwCacheParityCompliance } from '@joolie-boolie/testing/contracts';
import { useSWCache } from '../use-sw-cache';

// Mock the cache-manager module
vi.mock('@/lib/sw/cache-manager', () => ({
  isServiceWorkerSupported: vi.fn(() => true),
  getCacheStatus: vi.fn(() =>
    Promise.resolve({ questionsCached: 0, apiCached: 0, assetsCached: 0, totalFiles: 0 })
  ),
  clearQuestionsCache: vi.fn(() => Promise.resolve(true)),
  clearAllCache: vi.fn(() => Promise.resolve(true)),
  preloadQuestions: vi.fn(() => Promise.resolve()),
}));

import {
  isServiceWorkerSupported,
  getCacheStatus,
  clearQuestionsCache,
  clearAllCache,
  preloadQuestions,
} from '@/lib/sw/cache-manager';

describe('use-sw-cache (trivia)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isServiceWorkerSupported).mockReturnValue(true);
    vi.mocked(getCacheStatus).mockResolvedValue({
      questionsCached: 0,
      apiCached: 0,
      assetsCached: 0,
      totalFiles: 0,
    });
    vi.mocked(clearQuestionsCache).mockResolvedValue(true);
    vi.mocked(clearAllCache).mockResolvedValue(true);
    vi.mocked(preloadQuestions).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isSupported', () => {
    it('returns true when service workers are supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(true);

      const { result } = renderHook(() => useSWCache());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });
    });

    it('returns false when service workers are not supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(false);

      const { result } = renderHook(() => useSWCache());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(false);
      });
    });
  });

  describe('initial cache status fetch', () => {
    it('fetches cache status on mount', async () => {
      vi.mocked(getCacheStatus).mockResolvedValue({
        questionsCached: 5,
        apiCached: 3,
        assetsCached: 12,
        totalFiles: 20,
      });

      const { result } = renderHook(() => useSWCache());

      await waitFor(() => {
        expect(getCacheStatus).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.questionsCached).toBe(5);
        expect(result.current.totalFiles).toBe(20);
      });
    });

    it('does not fetch cache status if service worker not supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(false);

      renderHook(() => useSWCache());

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
      expect(result.current.questionsCached).toBe(0);
      expect(result.current.totalFiles).toBe(0);
    });
  });

  describe('parity contract — preloading guard resets correctly', () => {
    it('isPreloading is false before preload starts', async () => {
      const { result } = renderHook(() => useSWCache());

      assertSwCacheParityCompliance(
        { isPreloading: result.current.isPreloading, cacheStatus: 'idle' },
        { isPreloading: false, cacheStatus: 'idle' }
      );
    });

    it('isPreloading is true during preload', async () => {
      let resolvePreload: () => void;
      vi.mocked(preloadQuestions).mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePreload = resolve;
        });
      });

      const { result } = renderHook(() => useSWCache());

      // Start preload without awaiting
      act(() => {
        result.current.preload(['questions/set1.json']);
      });

      // Guard must be true during preload
      assertSwCacheParityCompliance(
        { isPreloading: result.current.isPreloading, cacheStatus: 'preloading' },
        { isPreloading: true, cacheStatus: 'preloading' }
      );

      // Resolve the preload
      await act(async () => {
        resolvePreload!();
      });

      // Guard must reset after preload
      assertSwCacheParityCompliance(
        { isPreloading: result.current.isPreloading, cacheStatus: 'idle' },
        { isPreloading: false, cacheStatus: 'idle' }
      );
    });

    it('isPreloading resets to false after successful preload (guard does not stay locked)', async () => {
      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        await result.current.preload(['questions/set1.json']);
      });

      assertSwCacheParityCompliance(
        { isPreloading: result.current.isPreloading, cacheStatus: 'complete' },
        { isPreloading: false, cacheStatus: 'complete' }
      );
    });

    it('isPreloading resets to false even when preload throws (finally block)', async () => {
      vi.mocked(preloadQuestions).mockRejectedValue(new Error('Preload failed'));

      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        // Suppress the thrown error at the call site
        await result.current.preload(['questions/set1.json']).catch(() => {});
      });

      // The finally block must always reset isPreloadingRef.current
      assertSwCacheParityCompliance(
        { isPreloading: result.current.isPreloading, cacheStatus: 'error' },
        { isPreloading: false, cacheStatus: 'error' }
      );
    });

    it('second preload call is ignored while first is still in progress (useRef guard)', async () => {
      let resolvePreload: () => void;
      vi.mocked(preloadQuestions).mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePreload = resolve;
        });
      });

      const { result } = renderHook(() => useSWCache());

      // Start first preload
      act(() => {
        result.current.preload(['questions/set1.json']);
      });

      // Attempt concurrent second preload — must be ignored by the ref guard
      act(() => {
        result.current.preload(['questions/set2.json']);
      });

      // preloadQuestions must only be called once (not twice)
      expect(preloadQuestions).toHaveBeenCalledTimes(1);
      expect(preloadQuestions).toHaveBeenCalledWith(['questions/set1.json'], expect.any(Function));

      // Cleanup
      await act(async () => {
        resolvePreload!();
      });
    });

    it('second preload can start after first completes (guard is cleared by finally)', async () => {
      const { result } = renderHook(() => useSWCache());

      // First preload completes successfully
      await act(async () => {
        await result.current.preload(['questions/set1.json']);
      });

      expect(preloadQuestions).toHaveBeenCalledTimes(1);

      // Second preload should now be permitted
      await act(async () => {
        await result.current.preload(['questions/set2.json']);
      });

      expect(preloadQuestions).toHaveBeenCalledTimes(2);
    });
  });

  describe('preload', () => {
    it('calls preloadQuestions with the provided file list', async () => {
      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        await result.current.preload(['questions/sports.json', 'questions/science.json']);
      });

      expect(preloadQuestions).toHaveBeenCalledWith(
        ['questions/sports.json', 'questions/science.json'],
        expect.any(Function)
      );
    });

    it('updates progress during preload', async () => {
      let progressCallback: ((loaded: number, total: number) => void) | undefined;

      vi.mocked(preloadQuestions).mockImplementation(async (_files, onProgress) => {
        progressCallback = onProgress;
      });

      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        const preloadPromise = result.current.preload(['q1.json', 'q2.json']);

        if (progressCallback) {
          progressCallback(1, 2);
        }

        await preloadPromise;
      });

      expect(preloadQuestions).toHaveBeenCalledWith(
        ['q1.json', 'q2.json'],
        expect.any(Function)
      );
    });

    it('resets progress to 0 after preload completes', async () => {
      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        await result.current.preload(['questions/set1.json']);
      });

      expect(result.current.preloadProgress).toBe(0);
    });

    it('does not preload if service worker not supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(false);

      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        await result.current.preload(['questions/set1.json']);
      });

      expect(preloadQuestions).not.toHaveBeenCalled();
    });

    it('refreshes cache status after preload', async () => {
      const { result } = renderHook(() => useSWCache());

      vi.mocked(getCacheStatus).mockClear();

      await act(async () => {
        await result.current.preload(['questions/set1.json']);
      });

      expect(getCacheStatus).toHaveBeenCalled();
    });
  });

  describe('clearQuestions', () => {
    it('clears the questions cache', async () => {
      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        await result.current.clearQuestions();
      });

      expect(clearQuestionsCache).toHaveBeenCalled();
    });

    it('refreshes cache status after clearing questions', async () => {
      const { result } = renderHook(() => useSWCache());

      vi.mocked(getCacheStatus).mockClear();

      await act(async () => {
        await result.current.clearQuestions();
      });

      expect(getCacheStatus).toHaveBeenCalled();
    });

    it('does not clear if service worker not supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(false);

      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        await result.current.clearQuestions();
      });

      expect(clearQuestionsCache).not.toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('clears all caches', async () => {
      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        await result.current.clearAll();
      });

      expect(clearAllCache).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('updates cache status on explicit refresh', async () => {
      vi.mocked(getCacheStatus)
        .mockResolvedValueOnce({ questionsCached: 0, apiCached: 0, assetsCached: 0, totalFiles: 0 })
        .mockResolvedValueOnce({ questionsCached: 10, apiCached: 2, assetsCached: 5, totalFiles: 17 });

      const { result } = renderHook(() => useSWCache());

      await waitFor(() => {
        expect(getCacheStatus).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(getCacheStatus).toHaveBeenCalledTimes(2);
      expect(result.current.questionsCached).toBe(10);
      expect(result.current.totalFiles).toBe(17);
    });

    it('does not refresh if service worker not supported', async () => {
      vi.mocked(isServiceWorkerSupported).mockReturnValue(false);

      const { result } = renderHook(() => useSWCache());

      await act(async () => {
        await result.current.refresh();
      });

      expect(getCacheStatus).not.toHaveBeenCalled();
    });
  });
});
