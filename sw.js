/* オフライン用：ページと教材・3D を端末に保存。更新はネット優先で取り込む */
const CACHE = 'thirty-v3';
const FILES = [
  './', 'index.html', 'app.js', 'style.css', 'data.js', 'en-data.js', 'trends.js', 'haptic.js', 'icon.svg', 'manifest.webmanifest',
  '3d.html', '3d/race.html', '3d/study.html', '3d/engine.js', '3d/ui.css', '3d/three.module.min.js',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
