// Service worker for wabbazzar.com.
//
// Strategy:
//   - Precache main-site static assets + sub-app entry URLs on install.
//   - Runtime: stale-while-revalidate for same-origin GETs. The first online
//     visit to each sub-app (/tetris/, /puffacles/, /portavec/) populates
//     their subresources so subsequent loads work offline.
//   - Runtime: cache-first for Google Fonts (stable URLs, rarely change).
//   - Navigations fall back to the cached root ('/') when offline and the
//     specific page isn't cached.
//
// Bump VERSION to invalidate old caches on next activation.

const VERSION = 'v1';
const CACHE_STATIC = `wz-static-${VERSION}`;
const CACHE_RUNTIME = `wz-runtime-${VERSION}`;

const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/styles.css',
    '/ascii.js',
    '/fracture.js',
    '/easter-egg.js',
    '/ascii-art.json',
    '/favicon.png',
    '/apple-touch-icon.png',
    '/icon-192.png',
    '/icon-512.png',
    '/manifest.webmanifest',
    '/assets/icons/shredly.png',
    '/assets/icons/quizly.png',
    '/assets/icons/starbird.png',
    '/assets/icons/portavec.png',
    '/assets/screenshots/shredly/iphone/01-live.png',
    '/assets/screenshots/shredly/iphone/02-schedule.png',
    '/assets/screenshots/shredly/iphone/03-weight.png',
    '/assets/screenshots/shredly/iphone/04-exercise.png',
    '/assets/screenshots/shredly/iphone/05-select.png',
    '/assets/screenshots/quizly/iphone/01-home.png',
    '/assets/screenshots/quizly/iphone/02-flashcards.png',
    '/assets/screenshots/quizly/iphone/03-match.png',
    '/assets/screenshots/quizly/iphone/04-audio.png',
    '/assets/screenshots/starbird/iphone/01-brands.png',
    '/assets/screenshots/starbird/iphone/02-about.png',
    '/assets/screenshots/starbird/iphone/03-charts.png',
    '/assets/screenshots/portavec/desktop/01-hero.png',
    '/assets/screenshots/portavec/desktop/02-editor.png',
    // Sub-app entry URLs. Only the HTML is precached here; subresources get
    // cached at runtime the first time the user opens each iframe online.
    '/tetris/',
    '/puffacles/?bg=wabbazzar',
    '/portavec/',
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_STATIC);
        // allSettled so a single 404 doesn't abort the whole install.
        await Promise.allSettled(PRECACHE_URLS.map(u => cache.add(new Request(u, { cache: 'reload' }))));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names
                .filter(n => n !== CACHE_STATIC && n !== CACHE_RUNTIME)
                .map(n => caches.delete(n))
        );
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Same-origin: stale-while-revalidate, with a navigation fallback to '/'.
    if (url.origin === self.location.origin) {
        event.respondWith(sameOriginHandler(req));
        return;
    }

    // Google Fonts: cache-first (CSS and font binaries).
    if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
        event.respondWith(cacheFirst(req));
        return;
    }

    // Everything else (other cross-origin) — default network, no caching.
});

async function sameOriginHandler(req) {
    const res = await staleWhileRevalidate(req);
    if (res) return res;
    // Navigation offline fallback: serve the cached root shell.
    if (req.mode === 'navigate') {
        const shell = await caches.match('/');
        if (shell) return shell;
    }
    return Response.error();
}

async function staleWhileRevalidate(req) {
    const cache = await caches.open(CACHE_RUNTIME);
    const staticCache = await caches.open(CACHE_STATIC);
    const cached = (await cache.match(req)) || (await staticCache.match(req));
    const network = fetch(req)
        .then(res => {
            if (res && res.ok && res.type !== 'opaque') {
                cache.put(req, res.clone()).catch(() => { });
            }
            return res;
        })
        .catch(() => null);
    return cached || (await network);
}

async function cacheFirst(req) {
    const cache = await caches.open(CACHE_RUNTIME);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone()).catch(() => { });
        return res;
    } catch {
        return cached || Response.error();
    }
}
