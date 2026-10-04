// Service worker minimal — mise en cache de l'app shell pour usage en
// connexion faible / hors-ligne partiel (section 6.2 / 6.3).
const CACHE = "wagadu-hub-v1";
const SHELL = ["/", "/login", "/dashboard", "/manifest.webmanifest", "/icons/icon-300.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Les appels API : réseau d'abord, jamais servis depuis un cache périmé.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }
  // Navigation / statiques : cache d'abord, mise à jour en arrière-plan.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
