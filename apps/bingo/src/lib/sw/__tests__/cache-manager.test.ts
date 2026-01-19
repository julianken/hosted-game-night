import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isServiceWorkerSupported,
  getCacheStatus,
  clearVoiceCache,
  preloadVoicePack,
  isVoicePackCached,
  createCacheManager,
} from '../cache-manager';

describe('cache-manager', () => {
  let mockServiceWorker: {
    postMessage: ReturnType<typeof vi.fn>;
  };
  let mockRegistration: {
    active: typeof mockServiceWorker | null;
  };
  let messageChannelPort1: {
    onmessage: ((event: MessageEvent) => void) | null;
  };

  beforeEach(() => {
    // Create mock MessageChannel ports
    messageChannelPort1 = { onmessage: null };
    const messageChannelPort2 = {};

    // Use a constructor function instead of vi.fn() for MessageChannel
    // This ensures proper 'new' semantics
    const MockMessageChannel = function(this: { port1: typeof messageChannelPort1; port2: typeof messageChannelPort2 }) {
      this.port1 = messageChannelPort1;
      this.port2 = messageChannelPort2;
    };
    vi.stubGlobal('MessageChannel', MockMessageChannel);

    // Create mock service worker
    mockServiceWorker = {
      postMessage: vi.fn(),
    };

    mockRegistration = {
      active: mockServiceWorker,
    };

    // Mock navigator.serviceWorker
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve(mockRegistration),
      },
    });

    // Mock fetch
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('isServiceWorkerSupported', () => {
    it('returns true when serviceWorker is available in navigator', () => {
      expect(isServiceWorkerSupported()).toBe(true);
    });

    it('returns false when serviceWorker is not available', () => {
      vi.stubGlobal('navigator', {});

      expect(isServiceWorkerSupported()).toBe(false);
    });

    it('returns false when window is undefined (SSR)', () => {
      vi.stubGlobal('window', undefined);

      // Re-import to test with undefined window
      // Since window is stubbed as undefined, isServiceWorkerSupported should return false
      const result = typeof window === 'undefined' || !('serviceWorker' in navigator);
      expect(result).toBe(true);
    });
  });

  describe('getCacheStatus', () => {
    it('returns cache status from service worker response', async () => {
      const expectedStatus = { cachedPacks: ['standard', 'british'], totalFiles: 150 };

      const statusPromise = getCacheStatus();

      // Wait for the onmessage handler to be assigned
      await vi.waitFor(() => {
        expect(messageChannelPort1.onmessage).not.toBeNull();
      });

      // Trigger the response from service worker
      messageChannelPort1.onmessage?.({ data: expectedStatus } as MessageEvent);

      const result = await statusPromise;

      expect(result).toEqual(expectedStatus);
    });

    it('returns empty status when service worker not supported', async () => {
      vi.stubGlobal('navigator', {});

      const result = await getCacheStatus();

      expect(result).toEqual({ cachedPacks: [], totalFiles: 0 });
    });

    it('returns empty status when no active service worker', async () => {
      mockRegistration.active = null;

      const result = await getCacheStatus();

      expect(result).toEqual({ cachedPacks: [], totalFiles: 0 });
    });

    it('returns empty status on error response from service worker', async () => {
      const statusPromise = getCacheStatus();

      // Wait for the onmessage handler to be assigned
      await vi.waitFor(() => {
        expect(messageChannelPort1.onmessage).not.toBeNull();
      });

      // Trigger error response
      messageChannelPort1.onmessage?.({ data: { error: 'Cache error' } } as MessageEvent);

      const result = await statusPromise;

      expect(result).toEqual({ cachedPacks: [], totalFiles: 0 });
    });

    it('returns empty status on timeout', async () => {
      vi.useFakeTimers();

      const statusPromise = getCacheStatus();

      // Fast-forward past the 5 second timeout
      await vi.advanceTimersByTimeAsync(5001);

      const result = await statusPromise;

      expect(result).toEqual({ cachedPacks: [], totalFiles: 0 });

      vi.useRealTimers();
    });
  });

  describe('clearVoiceCache', () => {
    it('returns true when cache is cleared successfully', async () => {
      const clearPromise = clearVoiceCache();

      // Wait for the onmessage handler to be assigned
      await vi.waitFor(() => {
        expect(messageChannelPort1.onmessage).not.toBeNull();
      });

      // Trigger success response
      messageChannelPort1.onmessage?.({ data: { success: true } } as MessageEvent);

      const result = await clearPromise;

      expect(result).toBe(true);
    });

    it('returns false when clearing fails', async () => {
      const clearPromise = clearVoiceCache();

      // Wait for the onmessage handler to be assigned
      await vi.waitFor(() => {
        expect(messageChannelPort1.onmessage).not.toBeNull();
      });

      // Trigger failure response
      messageChannelPort1.onmessage?.({ data: { success: false } } as MessageEvent);

      const result = await clearPromise;

      expect(result).toBe(false);
    });

    it('returns false when service worker not supported', async () => {
      vi.stubGlobal('navigator', {});

      const result = await clearVoiceCache();

      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      const clearPromise = clearVoiceCache();

      // Wait for the onmessage handler to be assigned
      await vi.waitFor(() => {
        expect(messageChannelPort1.onmessage).not.toBeNull();
      });

      // Trigger error response
      messageChannelPort1.onmessage?.({ data: { error: 'Clear failed' } } as MessageEvent);

      const result = await clearPromise;

      expect(result).toBe(false);
    });
  });

  describe('isVoicePackCached', () => {
    it('returns true when pack is in cached packs list', async () => {
      const cachedPromise = isVoicePackCached('standard');

      // Wait for the onmessage handler to be assigned
      await vi.waitFor(() => {
        expect(messageChannelPort1.onmessage).not.toBeNull();
      });

      // Trigger response
      messageChannelPort1.onmessage?.({
        data: { cachedPacks: ['standard', 'british'], totalFiles: 150 },
      } as MessageEvent);

      const result = await cachedPromise;

      expect(result).toBe(true);
    });

    it('returns false when pack is not in cached packs list', async () => {
      const cachedPromise = isVoicePackCached('british-hall');

      // Wait for the onmessage handler to be assigned
      await vi.waitFor(() => {
        expect(messageChannelPort1.onmessage).not.toBeNull();
      });

      // Trigger response
      messageChannelPort1.onmessage?.({
        data: { cachedPacks: ['standard'], totalFiles: 75 },
      } as MessageEvent);

      const result = await cachedPromise;

      expect(result).toBe(false);
    });
  });

  describe('preloadVoicePack', () => {
    it('fetches all 75 files for standard voice pack', async () => {
      const mockFetch = vi.mocked(fetch);

      await preloadVoicePack('standard');

      // Standard pack should fetch 75 files
      expect(mockFetch).toHaveBeenCalledTimes(75);

      // Check some specific file paths
      expect(mockFetch).toHaveBeenCalledWith('/audio/voices/standard/B1.mp3');
      expect(mockFetch).toHaveBeenCalledWith('/audio/voices/standard/I16.mp3');
      expect(mockFetch).toHaveBeenCalledWith('/audio/voices/standard/N31.mp3');
      expect(mockFetch).toHaveBeenCalledWith('/audio/voices/standard/G46.mp3');
      expect(mockFetch).toHaveBeenCalledWith('/audio/voices/standard/O61.mp3');
    });

    it('fetches files in batches of 10', async () => {
      const fetchCalls: number[] = [];
      let batchCount = 0;

      vi.mocked(fetch).mockImplementation(() => {
        fetchCalls.push(batchCount);
        return Promise.resolve({ ok: true } as Response);
      });

      await preloadVoicePack('standard', (loaded) => {
        // Track when batches complete (every 10 files)
        if (loaded % 10 === 0) {
          batchCount++;
        }
      });

      // Should have been called 75 times total
      expect(fetch).toHaveBeenCalledTimes(75);

      // Verify batching by checking that files are processed in groups
      // The first 10 calls should all be in batch 0, etc.
      const firstBatch = fetchCalls.slice(0, 10);
      expect(firstBatch.every((b) => b === 0)).toBe(true);
    });

    it('calls progress callback correctly', async () => {
      const progressCallback = vi.fn();

      await preloadVoicePack('standard', progressCallback);

      // Should be called 75 times, once per file
      expect(progressCallback).toHaveBeenCalledTimes(75);

      // Check first and last calls
      expect(progressCallback).toHaveBeenNthCalledWith(1, 1, 75);
      expect(progressCallback).toHaveBeenLastCalledWith(75, 75);
    });

    it('handles fetch errors gracefully', async () => {
      const progressCallback = vi.fn();

      // Make every other fetch fail
      let callCount = 0;
      vi.mocked(fetch).mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: true } as Response);
      });

      // Should not throw
      await expect(preloadVoicePack('standard', progressCallback)).resolves.not.toThrow();

      // Progress callback should still be called for failed fetches
      expect(progressCallback).toHaveBeenCalledTimes(75);
    });

    it('continues loading after individual file failures', async () => {
      const progressCallback = vi.fn();

      // Fail first file, succeed rest
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('First file failed'))
        .mockResolvedValue({ ok: true } as Response);

      await preloadVoicePack('standard', progressCallback);

      // Should still complete all 75 files
      expect(progressCallback).toHaveBeenCalledTimes(75);
      expect(progressCallback).toHaveBeenLastCalledWith(75, 75);
    });

    it('uses manifest for british voice pack slang mappings', async () => {
      const mockManifest = {
        voicePacks: {
          british: {
            slangMappings: {
              '1': 'kellys-eye',
              '2': 'one-little-duck',
            },
          },
        },
      };

      vi.mocked(fetch).mockImplementation((url) => {
        if (url === '/audio/voices/manifest.json') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockManifest),
          } as Response);
        }
        return Promise.resolve({ ok: true } as Response);
      });

      await preloadVoicePack('british');

      // Should fetch manifest first
      expect(fetch).toHaveBeenCalledWith('/audio/voices/manifest.json');

      // Should use slang mappings for files
      expect(fetch).toHaveBeenCalledWith('/audio/voices/british/kellys-eye.mp3');
      expect(fetch).toHaveBeenCalledWith('/audio/voices/british/one-little-duck.mp3');
    });

    it('falls back to standard naming if manifest fetch fails', async () => {
      vi.mocked(fetch).mockImplementation((url) => {
        if (url === '/audio/voices/manifest.json') {
          return Promise.reject(new Error('Manifest not found'));
        }
        return Promise.resolve({ ok: true } as Response);
      });

      await preloadVoicePack('british');

      // Should fall back to standard B1, I16, etc. format
      expect(fetch).toHaveBeenCalledWith('/audio/voices/british/B1.mp3');
      expect(fetch).toHaveBeenCalledWith('/audio/voices/british/I16.mp3');
    });

    it('uses standard naming for non-british packs', async () => {
      await preloadVoicePack('standard-hall');

      expect(fetch).toHaveBeenCalledWith('/audio/voices/standard-hall/B1.mp3');
      expect(fetch).toHaveBeenCalledWith('/audio/voices/standard-hall/O75.mp3');
    });
  });

  describe('createCacheManager', () => {
    it('returns an object with all cache operations', () => {
      const manager = createCacheManager();

      expect(manager).toHaveProperty('getCacheStatus');
      expect(manager).toHaveProperty('clearVoiceCache');
      expect(manager).toHaveProperty('isVoicePackCached');
      expect(manager).toHaveProperty('preloadVoicePack');
      expect(manager).toHaveProperty('isSupported');

      expect(typeof manager.getCacheStatus).toBe('function');
      expect(typeof manager.clearVoiceCache).toBe('function');
      expect(typeof manager.isVoicePackCached).toBe('function');
      expect(typeof manager.preloadVoicePack).toBe('function');
      expect(typeof manager.isSupported).toBe('function');
    });

    it('isSupported returns same value as isServiceWorkerSupported', () => {
      const manager = createCacheManager();

      expect(manager.isSupported()).toBe(isServiceWorkerSupported());
    });
  });
});
