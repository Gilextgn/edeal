"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "@/app/(auth)/actions";
import { claimOfflinePages, clearOfflinePages, precachePages } from "@/lib/offline/pages";
import { Button } from "./ui";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

// Bandeau affiché sans connexion : ce qu'on voit date de la dernière visite.
export function OfflineBanner({ userId }: { userId: string }) {
  const t = useTranslations("offline");
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  useEffect(() => claimOfflinePages(userId), [userId]);

  if (online) return null;
  return (
    <p
      role="status"
      className="mb-5 rounded-2xl bg-warning-soft p-4 text-sm font-medium text-warning print:hidden"
    >
      {t("banner")}
    </p>
  );
}

// Prépare des pages pour un usage sans connexion (ex. le formulaire de vente
// d'un appareil, dès que sa fiche est ouverte).
export function Precache({ urls }: { urls: string[] }) {
  const key = urls.join("|");
  useEffect(() => {
    if (key) precachePages(key.split("|"));
  }, [key]);
  return null;
}

// Efface les pages gardées sur le téléphone avant de fermer la session.
export function LogoutButton({ children }: { children: ReactNode }) {
  return (
    <Button
      type="button"
      variant="danger"
      className="w-full sm:w-auto"
      onClick={async () => {
        await clearOfflinePages();
        await signOut();
      }}
    >
      {children}
    </Button>
  );
}
