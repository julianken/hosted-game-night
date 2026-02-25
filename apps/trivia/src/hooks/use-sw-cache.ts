import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCacheStatus,
  clearQuestionsCache,
  clearAllCache,
  preloadQuestions,
  isServiceWorkerSupported,
  type CacheStatus,
} from '@/lib/sw/cache-manager';

interface UseSWCacheResult {
  /** Whether service workers are supported */
  isSupported: boolean;
  /** Number of cached question files */
  questionsCached: number;
  /** Number of cached API responses */
  apiCached: number;
  /** Number of cached assets */
  assetsCached: number;
  /** Total number of cached files */
  totalFiles: number;
  /** Whether a preload is in progress */
  isPreloading: boolean;
  /** Progress of current preload (0-100) */
  preloadProgress: number;
  /** Preload question files */
  preload: (questionFiles: string[]) => Promise<void>;
  /** Clear questions cache */
  clearQuestions: () => Promise<void>;
  /** Clear all cached data */
  clearAll: () => Promise<void>;
  /** Refresh cache status */
  refresh: () => Promise<void>;
}

/**
 * Hook to interact with the service worker cache.
 * Provides cache status, preloading, and cache management.
 */
export function useSWCache(): UseSWCacheResult {
  const [isSupported] = useState(() => isServiceWorkerSupported());
  const [status, setStatus] = useState<CacheStatus>({
    questionsCached: 0,
    apiCached: 0,
    assetsCached: 0,
    totalFiles: 0,
  });
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const isPreloadingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isSupported) return;
    try {
      const newStatus = await getCacheStatus();
      setStatus(newStatus);
    } catch {
      // Ignore errors
    }
  }, [isSupported]);

  const preload = useCallback(
    async (questionFiles: string[]) => {
      if (!isSupported || isPreloadingRef.current) return;

      isPreloadingRef.current = true;
      setIsPreloading(true);
      setPreloadProgress(0);

      try {
        await preloadQuestions(questionFiles, (loaded, total) => {
          setPreloadProgress(Math.round((loaded / total) * 100));
        });
        await refresh();
      } finally {
        isPreloadingRef.current = false;
        setIsPreloading(false);
        setPreloadProgress(0);
      }
    },
    [isSupported, refresh]
  );

  const clearQuestions = useCallback(async () => {
    if (!isSupported) return;
    await clearQuestionsCache();
    await refresh();
  }, [isSupported, refresh]);

  const clearAll = useCallback(async () => {
    if (!isSupported) return;
    await clearAllCache();
    await refresh();
  }, [isSupported, refresh]);

  // Initial status fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isSupported,
    questionsCached: status.questionsCached,
    apiCached: status.apiCached,
    assetsCached: status.assetsCached,
    totalFiles: status.totalFiles,
    isPreloading,
    preloadProgress,
    preload,
    clearQuestions,
    clearAll,
    refresh,
  };
}
