// Listes proposées à la saisie d'un appareil : l'utilisateur choisit, il ne tape pas.
// Les capacités et couleurs sont des clés traduites dans messages/fr.json
// (catalog.capacity.*, catalog.color.*). Les modèles sont des noms propres.

export const MODELS = [
  "iPhone 17 Pro Max",
  "iPhone 17 Pro",
  "iPhone Air",
  "iPhone 17",
  "iPhone 16e",
  "iPhone 16 Pro Max",
  "iPhone 16 Pro",
  "iPhone 16 Plus",
  "iPhone 16",
  "iPhone 15 Pro Max",
  "iPhone 15 Pro",
  "iPhone 15 Plus",
  "iPhone 15",
  "iPhone 14 Pro Max",
  "iPhone 14 Pro",
  "iPhone 14 Plus",
  "iPhone 14",
  "iPhone 13 Pro Max",
  "iPhone 13 Pro",
  "iPhone 13",
  "iPhone 13 mini",
  "iPhone 12 Pro Max",
  "iPhone 12 Pro",
  "iPhone 12",
  "iPhone 12 mini",
  "iPhone 11 Pro Max",
  "iPhone 11 Pro",
  "iPhone 11",
  "iPhone SE (3e génération)",
  "iPhone SE (2e génération)",
  "iPhone XS Max",
  "iPhone XS",
  "iPhone XR",
  "iPhone X",
  "iPhone 8 Plus",
  "iPhone 8",
] as const;

export const CAPACITIES = ["64GB", "128GB", "256GB", "512GB", "1TB", "2TB"] as const;

export const COLORS = [
  "BLACK",
  "WHITE",
  "SILVER",
  "GRAY",
  "GOLD",
  "BLUE",
  "RED",
  "GREEN",
  "PURPLE",
  "PINK",
  "YELLOW",
  "ORANGE",
  "NATURAL_TITANIUM",
  "DESERT_TITANIUM",
  "OTHER",
] as const;

export type Capacity = (typeof CAPACITIES)[number];
export type Color = (typeof COLORS)[number];

export function isKnown<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}
