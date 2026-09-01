// JB's Radio — Service Worker
// Solo cachea el "cascarón" de la app para que abra al instante y sea instalable.
// NO cachea emisoras, podcasts ni streams: eso siempre necesita red y va directo,
// sin pasar por aquí.

const CACHE_NAME = "jbradio-shell-v2";
const SHELL_FILES = ["./", "./index.html"];

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
  // Radio-Browser, iTunes, streams de audio y feeds RSS van siempre directo a la red.
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
      return cached || network;
    })
  );
});
