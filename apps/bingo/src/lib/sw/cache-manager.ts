import { VoicePackId } from '@/types';

/**
 * Cache status returned from the service worker.
 */
export interface CacheStatus {
  cachedPacks: string[];
  totalFiles: number;
}

/**
 * Check if service workers are supported.
 */
export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Send a message to the service worker and wait for a response.
 */
async function sendMessageToSW<T>(message: { type: string; payload?: unknown }): Promise<T> {
  if (!isServiceWorkerSupported()) {
    throw new Error('Service workers not supported');
  }

  const registration = await navigator.serviceWorker.ready;
  const activeWorker = registration.active;
  if (!activeWorker) {
    throw new Error('No active service worker');
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data as T);
      }
    };

    activeWorker.postMessage(message, [messageChannel.port2]);

    // Timeout after 5 seconds
    setTimeout(() => {
      reject(new Error('Service worker message timeout'));
    }, 5000);
  });
}

/**
 * Get the current cache status from the service worker.
 */
export async function getCacheStatus(): Promise<CacheStatus> {
  try {
    return await sendMessageToSW<CacheStatus>({ type: 'GET_CACHE_STATUS' });
  } catch {
    return { cachedPacks: [], totalFiles: 0 };
  }
}

/**
 * Clear the voice pack cache.
 */
export async function clearVoiceCache(): Promise<boolean> {
  try {
    const result = await sendMessageToSW<{ success: boolean }>({ type: 'CLEAR_VOICE_CACHE' });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Check if a specific voice pack is cached.
 */
export async function isVoicePackCached(packId: VoicePackId): Promise<boolean> {
  const status = await getCacheStatus();
  return status.cachedPacks.includes(packId);
}

/**
 * Preload a voice pack by fetching all audio files.
 * The service worker will cache them automatically.
 */
export async function preloadVoicePack(
  packId: VoicePackId,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  const columns = ['B', 'I', 'N', 'G', 'O'] as const;
  const files: string[] = [];

  // Generate file list based on pack type
  if (packId === 'british' || packId === 'british-hall') {
    // British packs use slang filenames - fetch manifest to get mappings
    try {
      const manifestResponse = await fetch('/audio/voices/manifest.json');
      const manifest = await manifestResponse.json();
      const slangMappings = manifest.voicePacks[packId]?.slangMappings || {};

      for (let i = 1; i <= 75; i++) {
        const filename = slangMappings[String(i)] || `${i}`;
        files.push(`/audio/voices/${packId}/${filename}.mp3`);
      }
    } catch {
      // Fallback to standard naming if manifest unavailable
      for (let i = 1; i <= 75; i++) {
        const col = columns[Math.floor((i - 1) / 15)];
        files.push(`/audio/voices/${packId}/${col}${i}.mp3`);
      }
    }
  } else {
    // Standard packs use B1, I16, etc. format
    for (let i = 1; i <= 75; i++) {
      const col = columns[Math.floor((i - 1) / 15)];
      files.push(`/audio/voices/${packId}/${col}${i}.mp3`);
    }
  }

  let loaded = 0;
  const total = files.length;

  // Fetch files in batches to avoid overwhelming the browser
  const batchSize = 10;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (file) => {
        try {
          await fetch(file);
          loaded++;
          onProgress?.(loaded, total);
        } catch {
          // Ignore individual file failures
          loaded++;
          onProgress?.(loaded, total);
        }
      })
    );
  }
}

/**
 * Hook-friendly wrapper for cache operations.
 */
export function createCacheManager() {
  return {
    getCacheStatus,
    clearVoiceCache,
    isVoicePackCached,
    preloadVoicePack,
    isSupported: isServiceWorkerSupported,
  };
}
