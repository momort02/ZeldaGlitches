// ══════════════════════════════════════════
//  HYRULE GLITCH ARCHIVE — sw.js
//  Stratégie :
//    • Assets statiques (HTML/CSS/JS/SVG) → Cache First
//    • Firebase / Google APIs             → Network Only (bypass)
// ══════════════════════════════════════════

const CACHE_NAME = 'hga-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/logo.svg',
];

// ── INSTALL ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE : purge anciens caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ──
const BYPASS_HOSTS = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'gstatic.com',
  'googleapis.com',
  'youtube-nocookie.com',
  'youtube.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Bypass : Firebase, Google, YouTube, fonts
  if (BYPASS_HOSTS.some(h => url.hostname.includes(h))) return;

  // Non-GET : réseau direct
  if (event.request.method !== 'GET') return;

  // Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => {
          // Fallback offline
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
    })
  );
});