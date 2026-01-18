import { useState, useEffect, useCallback } from 'react';
import {
  getCacheStatus,
  clearVoiceCache,
  preloadVoicePack,
  isServiceWorkerSupported,
  type CacheStatus,
} from '@/lib/sw/cache-manager';
import { VoicePackId } from '@/types';

interface UseSWCacheResult {
  /** Whether service workers are supported */
  isSupported: boolean;
  /** List of currently cached voice pack IDs */
  cachedPacks: string[];
  /** Total number of cached audio files */
  totalFiles: number;
  /** Whether a preload is in progress */
  isPreloading: boolean;
  /** Progress of current preload (0-100) */
  preloadProgress: number;
  /** Preload a voice pack */
  preload: (packId: VoicePackId) => Promise<void>;
  /** Clear all cached voice packs */
  clearCache: () => Promise<void>;
  /** Refresh cache status */
  refresh: () => Promise<void>;
}

/**
 * Hook to interact with the service worker cache.
 * Provides cache status, preloading, and cache management.
 */
export function useSWCache(): UseSWCacheResult {
  const [isSupported] = useState(() => isServiceWorkerSupported());
  const [status, setStatus] = useState<CacheStatus>({ cachedPacks: [], totalFiles: 0 });
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);

  const refresh = useCallback(async () => {
    if (!isSupported) return;
    try {
      const newStatus = await getCacheStatus();
      setStatus(newStatus);
    } catch {
      // Ignore errors
    }
  }, [isSupported]);

  const preload = useCallback(async (packId: VoicePackId) => {
    if (!isSupported || isPreloading) return;

    setIsPreloading(true);
    setPreloadProgress(0);

    try {
      await preloadVoicePack(packId, (loaded, total) => {
        setPreloadProgress(Math.round((loaded / total) * 100));
      });
      await refresh();
    } finally {
      setIsPreloading(false);
      setPreloadProgress(0);
    }
  }, [isSupported, isPreloading, refresh]);

  const clearCache = useCallback(async () => {
    if (!isSupported) return;
    await clearVoiceCache();
    await refresh();
  }, [isSupported, refresh]);

  // Initial status fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isSupported,
    cachedPacks: status.cachedPacks,
    totalFiles: status.totalFiles,
    isPreloading,
    preloadProgress,
    preload,
    clearCache,
    refresh,
  };
}
