/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker';
import { CacheFirst, NetworkFirst, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';
import { ExpirationPlugin } from 'serwist';
import { CacheableResponsePlugin } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Cache versioning for proper cleanup
const CACHE_VERSION = 'v1';
const VOICE_CACHE_NAME = `voice-packs-${CACHE_VERSION}`;
const MAX_VOICE_PACKS = 2;
const FILES_PER_PACK = 75;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    // Voice pack audio files - CacheFirst for instant playback
    {
      matcher: ({ url }) => /\/audio\/voices\/.*\.mp3$/.test(url.pathname),
      handler: new CacheFirst({
        cacheName: VOICE_CACHE_NAME,
        plugins: [
          new ExpirationPlugin({
            maxEntries: MAX_VOICE_PACKS * FILES_PER_PACK + 20,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      }),
    },
    // Voice manifest - NetworkFirst to get updates
    {
      matcher: ({ url }) => /\/audio\/voices\/manifest\.json$/.test(url.pathname),
      handler: new NetworkFirst({
        cacheName: 'voice-manifest',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 1,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
      }),
    },
    // Default roll sound - precache for instant first-play
    {
      matcher: ({ url }) =>
        url.pathname === '/audio/sfx/metal-cage/2s.mp3' ||
        url.pathname === '/audio/sfx/metal-cage/2s-hall.mp3',
      handler: new CacheFirst({
        cacheName: 'bingo-sfx-default-v1',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 5,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      }),
    },
    // Other roll sounds - cache on demand when selected
    {
      matcher: ({ url }) => /\/audio\/sfx\/.*\.mp3$/.test(url.pathname),
      handler: new CacheFirst({
        cacheName: 'bingo-sfx-v1',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 30,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      }),
    },
  ],
});

// Clean up old voice pack caches on activation
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete old versioned voice caches
            return name.startsWith('voice-packs-') && name !== VOICE_CACHE_NAME;
          })
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Message handler for cache management from the app
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'CLEAR_VOICE_CACHE') {
    event.waitUntil(
      caches.delete(VOICE_CACHE_NAME).then(() => {
        event.ports[0]?.postMessage({ success: true });
      })
    );
  }

  if (event.data?.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      caches.open(VOICE_CACHE_NAME).then(async (cache) => {
        const keys = await cache.keys();
        const packs = new Set<string>();

        keys.forEach((request) => {
          // Extract pack name from URL like /audio/voices/standard/B1.mp3
          const match = request.url.match(/\/audio\/voices\/([^/]+)\//);
          if (match) {
            packs.add(match[1]);
          }
        });

        event.ports[0]?.postMessage({
          cachedPacks: Array.from(packs),
          totalFiles: keys.length,
        });
      })
    );
  }
});

serwist.addEventListeners();
