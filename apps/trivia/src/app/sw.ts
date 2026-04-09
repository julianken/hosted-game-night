/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker';
import {
  CacheFirst,
  NetworkFirst,
  Serwist,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from 'serwist';
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
const QUESTIONS_CACHE_NAME = `trivia-questions-${CACHE_VERSION}`;
const API_CACHE_NAME = `trivia-api-${CACHE_VERSION}`;
const ASSETS_CACHE_NAME = `trivia-assets-${CACHE_VERSION}`;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    // Question data files - CacheFirst for instant loading
    {
      matcher: ({ url }) => /\/questions\/.*\.json$/.test(url.pathname),
      handler: new CacheFirst({
        cacheName: QUESTIONS_CACHE_NAME,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      }),
    },
    // API responses - NetworkFirst to get fresh data when online
    {
      matcher: ({ url }) =>
        url.pathname.startsWith('/api/'),
      handler: new NetworkFirst({
        cacheName: API_CACHE_NAME,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
        networkTimeoutSeconds: 10,
      }),
    },
    // Static assets (images, fonts) - CacheFirst for performance
    {
      matcher: ({ url }) =>
        /\.(png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/.test(url.pathname),
      handler: new CacheFirst({
        cacheName: ASSETS_CACHE_NAME,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      }),
    },
  ],
});

// Clean up old caches on activation
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete old versioned caches
            return (
              (name.startsWith('trivia-questions-') &&
                name !== QUESTIONS_CACHE_NAME) ||
              (name.startsWith('trivia-api-') && name !== API_CACHE_NAME) ||
              (name.startsWith('trivia-assets-') && name !== ASSETS_CACHE_NAME)
            );
          })
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Message handler for cache management from the app
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'CLEAR_QUESTIONS_CACHE') {
    event.waitUntil(
      caches.delete(QUESTIONS_CACHE_NAME).then(() => {
        event.ports[0]?.postMessage({ success: true });
      })
    );
  }

  if (event.data?.type === 'CLEAR_ALL_CACHE') {
    event.waitUntil(
      Promise.all([
        caches.delete(QUESTIONS_CACHE_NAME),
        caches.delete(API_CACHE_NAME),
        caches.delete(ASSETS_CACHE_NAME),
      ]).then(() => {
        event.ports[0]?.postMessage({ success: true });
      })
    );
  }

  if (event.data?.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      Promise.all([
        caches.open(QUESTIONS_CACHE_NAME).then((cache) => cache.keys()),
        caches.open(API_CACHE_NAME).then((cache) => cache.keys()),
        caches.open(ASSETS_CACHE_NAME).then((cache) => cache.keys()),
      ]).then(([questionKeys, apiKeys, assetKeys]) => {
        event.ports[0]?.postMessage({
          questionsCached: questionKeys.length,
          apiCached: apiKeys.length,
          assetsCached: assetKeys.length,
          totalFiles: questionKeys.length + apiKeys.length + assetKeys.length,
        });
      })
    );
  }
});

serwist.addEventListeners();
