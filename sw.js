const C = 'hz-v5';
const CORE = ['./', 'index.html', 'styles.css', 'js/app.js', 'js/data.js', 'js/maps.js', 'js/char3d.js', 'char/face.webp', 'config.js', 'seed/jahan.enc.json', 'manifest.webmanifest', 'research.json', 'icons/hz-icon-192.png', 'icons/hz-mark.svg', 'plan/healthzilla-plan.pdf'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api') || u.pathname.endsWith('.mp4')) return;
  const key = u.search && u.pathname.endsWith('.enc.json') ? u.origin + u.pathname : e.request; // cache-busted seed: store one copy
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); if (r.ok) caches.open(C).then(c => c.put(key, cp)); return r; }).catch(() => caches.match(key, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
