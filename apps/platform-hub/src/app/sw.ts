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
const API_CACHE_NAME = `platform-hub-api-${CACHE_VERSION}`;
const ASSETS_CACHE_NAME = `platform-hub-assets-${CACHE_VERSION}`;
const PAGES_CACHE_NAME = `platform-hub-pages-${CACHE_VERSION}`;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    // API responses - NetworkFirst to get fresh data when online
    // IMPORTANT: Exclude /api/auth/ routes — service worker responses strip
    // Set-Cookie headers (per Fetch spec), which breaks OAuth token storage.
    {
      matcher: ({ url }) =>
        url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth/'),
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
    // HTML pages - NetworkFirst for fresh content
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE_NAME,
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
              (name.startsWith('platform-hub-api-') && name !== API_CACHE_NAME) ||
              (name.startsWith('platform-hub-assets-') &&
                name !== ASSETS_CACHE_NAME) ||
              (name.startsWith('platform-hub-pages-') && name !== PAGES_CACHE_NAME)
            );
          })
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Message handler for cache management from the app
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'CLEAR_ALL_CACHE') {
    event.waitUntil(
      Promise.all([
        caches.delete(API_CACHE_NAME),
        caches.delete(ASSETS_CACHE_NAME),
        caches.delete(PAGES_CACHE_NAME),
      ]).then(() => {
        event.ports[0]?.postMessage({ success: true });
      })
    );
  }

  if (event.data?.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      Promise.all([
        caches.open(API_CACHE_NAME).then((cache) => cache.keys()),
        caches.open(ASSETS_CACHE_NAME).then((cache) => cache.keys()),
        caches.open(PAGES_CACHE_NAME).then((cache) => cache.keys()),
      ]).then(([apiKeys, assetKeys, pageKeys]) => {
        event.ports[0]?.postMessage({
          apiCached: apiKeys.length,
          assetsCached: assetKeys.length,
          pagesCached: pageKeys.length,
          totalFiles: apiKeys.length + assetKeys.length + pageKeys.length,
        });
      })
    );
  }
});

// Auth API routes MUST bypass the service worker entirely.
// When a service worker handles a fetch via respondWith(), browsers strip
// Set-Cookie headers from the response (per the Fetch spec). This breaks
// OAuth token storage since /api/auth/token sets httpOnly cookies.
// By stopping propagation before Serwist's listener, no respondWith() is
// called, so the browser handles the request natively and preserves cookies.
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/auth/')) {
    event.stopImmediatePropagation();
    return; // Browser handles natively — Set-Cookie headers preserved
  }
});

serwist.addEventListeners();
