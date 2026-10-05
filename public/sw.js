// Service worker : rend l'application installable et utilisable sans connexion.
//
// - Fichiers statiques (scripts, styles, polices, icônes) : servis depuis le
//   cache, téléchargés une seule fois.
// - Pages : réseau d'abord ; chaque page ouverte est gardée, et resservie
//   telle quelle quand le réseau manque. Une page jamais ouverte donne
//   l'écran « Pas de connexion ».
// - Les formulaires liés à un appareil (constat, dépôt, vente) sont mis en
//   cache d'avance à l'ouverture de sa fiche (message PRECACHE), pour pouvoir
//   saisir une vente hors-ligne. L'envoi passe par la file d'attente.
//
// Changer VERSION vide les anciens caches au prochain chargement.
const VERSION = "v2";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== STATIC && key !== PAGES).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:png|ico|svg|woff2?)$/.test(url.pathname)
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { cacheName: STATIC });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC);
    await cache.put(request, response.clone());
  }
  return response;
}

// Garde une page et les fichiers statiques qu'elle référence, pour qu'elle
// puisse s'afficher entièrement sans réseau.
async function savePage(url, response) {
  const type = response.headers.get("content-type") || "";
  if (!response.ok || response.redirected || !type.includes("text/html")) return;

  const html = await response.clone().text();
  const pages = await caches.open(PAGES);
  await pages.put(url, response);

  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\\\s)]+/g) || [])];
  const statics = await caches.open(STATIC);
  await Promise.all(
    assets.map(async (asset) => {
      if (await statics.match(asset)) return;
      try {
        const fetched = await fetch(asset);
        if (fetched.ok) await statics.put(asset, fetched);
      } catch {
        // Réseau coupé pendant la mise en cache : la page restera incomplète
        // hors-ligne jusqu'à sa prochaine ouverture en ligne.
      }
    }),
  );
}

async function networkFirstPage(event) {
  const { request } = event;
  try {
    const response = await fetch(request);
    event.waitUntil(savePage(request.url, response.clone()));
    return response;
  } catch {
    const cached = await caches.match(request.url, { cacheName: PAGES });
    return cached || caches.match(OFFLINE_URL, { cacheName: STATIC });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isStatic(url)) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(event));
  }
  // Le reste (données de navigation interne, envois) va au réseau. Sans
  // connexion, l'application recharge alors la page entière, servie ci-dessus.
});

self.addEventListener("message", (event) => {
  const { type, urls } = event.data || {};

  if (type === "PRECACHE" && Array.isArray(urls)) {
    event.waitUntil(
      Promise.all(
        urls.map(async (path) => {
          const url = new URL(path, self.location.origin).href;
          try {
            await savePage(url, await fetch(url, { credentials: "same-origin" }));
          } catch {
            // Hors-ligne : rien à mettre en cache pour l'instant.
          }
        }),
      ),
    );
  }

  // À la déconnexion ou au changement de compte : les pages gardées
  // contiennent des données personnelles.
  if (type === "CLEAR_PAGES") {
    event.waitUntil(caches.delete(PAGES));
  }
});
