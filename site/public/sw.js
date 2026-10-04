// Ce projet ne pose volontairement aucun Service Worker — ce fichier existe
// uniquement pour désinstaller un Service Worker fantôme qui pourrait avoir
// été enregistré sur cette origine par un autre projet ayant tourné sur le
// même port (localhost:3000 est réutilisé par beaucoup de projets Next.js en
// développement). Un Service Worker actif intercepte les requêtes et peut
// servir des pages périmées indéfiniment, même après un rechargement forcé —
// le cache HTTP classique (Ctrl+Maj+R) ne le vide jamais. Le navigateur
// vérifie périodiquement une mise à jour du script d'un Service Worker déjà
// installé ; dès qu'il récupère celui-ci, il se désinstalle tout seul et
// recharge les onglets concernés, sans action manuelle nécessaire.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.registration
      .unregister()
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => {
        for (const client of clients) {
          client.navigate(client.url);
        }
      }),
  );
});
