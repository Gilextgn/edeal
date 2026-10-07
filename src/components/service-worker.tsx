"use client";

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // En développement, un service worker resté d'un `npm start` sur la même
      // adresse resservirait d'anciens scripts et styles : on le retire, avec
      // ses caches, pour toujours voir le code du jour.
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
        .catch(() => {});
      if ("caches" in window) {
        void caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch(() => {});
      }
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sans service worker l'application reste utilisable en ligne.
    });
  }, []);

  return null;
}
