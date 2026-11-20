// Dziennik Snów — service worker (działanie offline)
const CACHE = "ds-v1";
const PLIKI = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PLIKI)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return; // opinie (Supabase) zawsze z internetu
  // Najpierw internet (świeża wersja), bez internetu — kopia z telefonu
  e.respondWith(
    fetch(req).then(res => {
      const kopia = res.clone();
      caches.open(CACHE).then(c => c.put(req, kopia));
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
