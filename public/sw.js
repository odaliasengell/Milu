const CACHE_NAME = "milu-static-v1";
const STATIC_PATHS = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_PATHS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

// Solo se cachean íconos y el manifest (assets estáticos sin datos del usuario).
// Todo lo demás (páginas, datos de Supabase) siempre va a la red para no mostrar
// información desactualizada o de otra sesión.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (STATIC_PATHS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});
