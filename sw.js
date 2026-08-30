// JB's Radio — Service Worker
// Solo cachea el "cascarón" de la app (HTML, manifest, iconos) para que abra
// al instante y cuente como app instalable. NO cachea emisoras, podcasts ni
// streams: esos siempre necesitan red y se piden directo, sin pasar por aquí.

const CACHE_NAME = "jbradio-shell-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  const url = new URL(event.request.url);

  // Solo controlamos peticiones al propio dominio (el cascarón de la app).
  // Todo lo demás (Radio-Browser, iTunes, streams de audio, feeds RSS)
  // va siempre directo a la red, sin interceptar ni cachear.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      const network = fetch(event.request)
        .then(function (res) {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
          }
          return res;
        })
        .catch(function () { return cached; });
      // Cache primero si existe (carga instantánea), y de fondo se actualiza con la red.
      return cached || network;
    })
  );
});
