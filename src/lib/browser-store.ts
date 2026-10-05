"use client";

import { useCallback, useSyncExternalStore } from "react";

// Petits réglages gardés dans le navigateur (menu replié, thème). Lus avec
// useSyncExternalStore : pas d'écart entre le rendu serveur et le navigateur.

const CHANGED = "edeal:store-changed";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible : le réglage ne sera pas retenu, sans gravité.
  }
  window.dispatchEvent(new Event(CHANGED));
}

/** Interrupteur retenu d'une visite à l'autre (ex. menu latéral replié). */
export function usePersistentFlag(key: string): [boolean, () => void] {
  const on = useSyncExternalStore(
    subscribe,
    () => read(key) === "1",
    () => false,
  );
  const toggle = useCallback(() => write(key, read(key) === "1" ? "0" : "1"), [key]);
  return [on, toggle];
}

const THEME_KEY = "edeal:theme";

/** Thème clair ou sombre. Le premier affichage est réglé par le script du layout. */
export function useTheme(): ["light" | "dark", () => void] {
  const theme = useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light" as const,
  );
  const toggle = useCallback(() => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    write(THEME_KEY, next);
  }, []);
  return [theme, toggle];
}
