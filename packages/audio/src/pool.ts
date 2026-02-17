// =============================================================================
// Audio Pool Management - Prevents memory leaks by reusing audio elements
// =============================================================================

export interface PooledAudio {
  element: HTMLAudioElement;
  inUse: boolean;
}

// Track all active audio elements for cleanup
const activeAudioElements: Set<HTMLAudioElement> = new Set();

/**
 * Get or create a pooled audio element for a given sound file.
 * Returns null if Audio is not available (SSR).
 */
export function getPooledAudio(
  pool: Map<string, PooledAudio[]>,
  soundFile: string,
  poolSize: number
): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') {
    return null;
  }

  // Get or create pool for this sound file
  if (!pool.has(soundFile)) {
    pool.set(soundFile, []);
  }

  const soundPool = pool.get(soundFile)!;

  // Find an available element in the pool
  for (const pooled of soundPool) {
    if (!pooled.inUse) {
      pooled.inUse = true;
      pooled.element.currentTime = 0;
      activeAudioElements.add(pooled.element);
      return pooled.element;
    }
  }

  // Create new element if pool isn't full
  if (soundPool.length < poolSize) {
    const element = new Audio(soundFile);
    const pooled: PooledAudio = { element, inUse: true };
    soundPool.push(pooled);
    activeAudioElements.add(element);
    return element;
  }

  // Pool is full and all in use - create a temporary element
  const tempElement = new Audio(soundFile);
  activeAudioElements.add(tempElement);
  return tempElement;
}

/**
 * Release a pooled audio element back to the pool.
 */
export function releasePooledAudio(
  pool: Map<string, PooledAudio[]>,
  soundFile: string,
  element: HTMLAudioElement
): void {
  activeAudioElements.delete(element);

  const soundPool = pool.get(soundFile);
  if (soundPool) {
    const pooled = soundPool.find((p) => p.element === element);
    if (pooled) {
      pooled.inUse = false;
      return;
    }
  }

  // Element wasn't from the pool (temporary) - clean it up
  cleanupAudioElement(element);
}

/**
 * Clean up an audio element to release memory.
 */
export function cleanupAudioElement(audio: HTMLAudioElement): void {
  audio.pause();
  audio.onended = null;
  audio.onerror = null;
  audio.oncanplaythrough = null;
  audio.src = ''; // Release media resource
  audio.load(); // Force release of any buffered data
  activeAudioElements.delete(audio);
}

/**
 * Clean up all provided pools plus any remaining tracked active elements.
 * Pass all pool Maps owned by the caller so they are drained and cleared.
 */
export function cleanupAllPools(pools: Map<string, PooledAudio[]>[]): void {
  for (const pool of pools) {
    for (const [, soundPool] of pool) {
      for (const pooled of soundPool) {
        cleanupAudioElement(pooled.element);
      }
    }
    pool.clear();
  }

  // Clean up any remaining active elements (e.g. temporary one-shots)
  for (const element of activeAudioElements) {
    cleanupAudioElement(element);
  }
  activeAudioElements.clear();
}

/**
 * Pause all currently active audio elements and reset their playback position.
 * Does not release them from pools — call this for a soft stop (e.g. stopPlayback).
 */
export function pauseAllActiveAudio(): void {
  for (const element of activeAudioElements) {
    element.pause();
    element.currentTime = 0;
  }
}

/**
 * Get the count of active audio elements (for testing).
 */
export function getActiveAudioCount(): number {
  return activeAudioElements.size;
}
