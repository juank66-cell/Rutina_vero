// Service Worker — cache offline simple (Rutina Vero)
// OJO: todas las apps de juank66-cell.github.io comparten el mismo almacén de caches.
// Por eso solo se borran caches propias (prefijo CACHE_PREFIX), nunca las de otras apps.
const CACHE_PREFIX = "rutina-vero-";
const CACHE_VERSION = "rutina-vero-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_VERSION)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // No cachear peticiones a Apps Script ni a fonts de Google (siempre en vivo)
  if (url.hostname.includes("script.google.com") ||
      url.hostname.includes("googleapis.com") ||
      url.hostname.includes("gstatic.com")) {
    return; // deja pasar a la red
  }

  // Solo GET
  if (event.request.method !== "GET") return;

  // Estrategia: cache-first para assets propios (solo en NUESTRA cache), con fallback a red
  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((resp) => {
          // Cachear respuesta si es de nuestro origen
          if (resp.ok && url.origin === location.origin) {
            cache.put(event.request, resp.clone());
          }
          return resp;
        }).catch(() => {
          // Offline y no en cache → devolver la página principal para rutas navegables
          if (event.request.mode === "navigate") {
            return cache.match("./index.html");
          }
        });
      })
    )
  );
});
