/**
 * Service Worker — Husband & Wife Meeting
 *
 * Cache-first strategy for the app shell and content.
 * Enables full offline use after the first visit.
 */

const CACHE_NAME = "hw-meeting-v1";

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./content.js",
  "./manifest.json",
  "./icon.svg",
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first, falling back to network
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip Google Fonts — let the network handle those (they have their own caching)
  const url = new URL(event.request.url);
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then((response) => {
        // Don't cache non-success responses
        if (!response || response.status !== 200) {
          return response;
        }
        // Cache same-origin responses for future offline use
        if (url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback — return the main page for navigation requests
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
        // For other requests, just fail gracefully
        return new Response("", { status: 408 });
      });
    })
  );
});
