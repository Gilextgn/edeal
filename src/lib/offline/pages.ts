// Dialogue avec le service worker (public/sw.js) pour les pages gardées
// sur le téléphone. Sans service worker (développement, vieux navigateur),
// ces fonctions ne font rien.

const USER_KEY = "edeal:user";

function post(message: { type: string; urls?: string[] }) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => registration.active?.postMessage(message))
    .catch(() => {});
}

/** Met en cache d'avance des pages, pour pouvoir les ouvrir sans connexion. */
export function precachePages(urls: string[]) {
  if (navigator.onLine) post({ type: "PRECACHE", urls });
}

/** Efface les pages gardées : elles contiennent des données personnelles. */
export async function clearOfflinePages() {
  post({ type: "CLEAR_PAGES" });
  try {
    localStorage.removeItem(USER_KEY);
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("pages-")).map((key) => caches.delete(key)));
  } catch {
    // Cache indisponible (navigation privée) : rien à effacer.
  }
}

/**
 * À appeler à l'ouverture de l'application : si un autre compte s'est
 * connecté sur ce téléphone sans passer par la déconnexion, on efface les
 * pages de l'ancien compte.
 */
export function claimOfflinePages(userId: string) {
  try {
    const previous = localStorage.getItem(USER_KEY);
    if (previous && previous !== userId) void clearOfflinePages();
    localStorage.setItem(USER_KEY, userId);
  } catch {
    // Stockage indisponible : pas de suivi possible, sans gravité.
  }
}
