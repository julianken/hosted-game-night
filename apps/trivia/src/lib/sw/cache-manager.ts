/**
 * Cache status returned from the service worker.
 */
export interface CacheStatus {
  questionsCached: number;
  apiCached: number;
  assetsCached: number;
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
    return { questionsCached: 0, apiCached: 0, assetsCached: 0, totalFiles: 0 };
  }
}

/**
 * Clear the questions cache.
 */
export async function clearQuestionsCache(): Promise<boolean> {
  try {
    const result = await sendMessageToSW<{ success: boolean }>({ type: 'CLEAR_QUESTIONS_CACHE' });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Clear all caches.
 */
export async function clearAllCache(): Promise<boolean> {
  try {
    const result = await sendMessageToSW<{ success: boolean }>({ type: 'CLEAR_ALL_CACHE' });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Preload question data by fetching all available question files.
 * The service worker will cache them automatically.
 */
export async function preloadQuestions(
  questionFiles: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  let loaded = 0;
  const total = questionFiles.length;

  // Fetch files in batches to avoid overwhelming the browser
  const batchSize = 5;
  for (let i = 0; i < questionFiles.length; i += batchSize) {
    const batch = questionFiles.slice(i, i + batchSize);
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
    clearQuestionsCache,
    clearAllCache,
    preloadQuestions,
    isSupported: isServiceWorkerSupported,
  };
}
