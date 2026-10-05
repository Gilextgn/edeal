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

// Palettes de couleurs proposées (définies dans src/app/globals.css).
// `swatch` : les deux couleurs montrées dans le sélecteur.
export const PALETTES = [
  { id: "onyx", swatch: ["#18181b", "#e0a800"] },
  { id: "grenat", swatch: ["#9f1239", "#f59e0b"] },
  { id: "mandarine", swatch: ["#c2410c", "#facc15"] },
  { id: "orchidee", swatch: ["#86198f", "#fb7185"] },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

const PALETTE_KEY = "edeal:palette";

/** Palette choisie par l'utilisateur, gardée dans son navigateur. */
export function usePalette(): [PaletteId, (palette: PaletteId) => void] {
  const palette = useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.palette as PaletteId | undefined) ?? "onyx",
    () => "onyx" as const,
  );
  const choose = useCallback((next: PaletteId) => {
    document.documentElement.dataset.palette = next;
    write(PALETTE_KEY, next);
  }, []);
  return [palette, choose];
}
