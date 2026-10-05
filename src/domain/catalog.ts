// Listes proposées à la saisie d'un appareil : l'utilisateur choisit, il ne tape pas.
// Les capacités et couleurs sont des clés traduites dans messages/fr.json
// (catalog.capacity.*, catalog.color.*). Les modèles sont des noms propres.

const APPLE = [
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
  "iPhone 7 Plus",
  "iPhone 7",
] as const;

const SAMSUNG = [
  "Galaxy S25 Ultra",
  "Galaxy S25+",
  "Galaxy S25",
  "Galaxy S24 Ultra",
  "Galaxy S24+",
  "Galaxy S24",
  "Galaxy S24 FE",
  "Galaxy S23 Ultra",
  "Galaxy S23+",
  "Galaxy S23",
  "Galaxy S22 Ultra",
  "Galaxy S22+",
  "Galaxy S22",
  "Galaxy S21 Ultra",
  "Galaxy S21+",
  "Galaxy S21",
  "Galaxy S20 Ultra",
  "Galaxy S20+",
  "Galaxy S20",
  "Galaxy S10+",
  "Galaxy S10",
  "Galaxy S10e",
  "Galaxy S9+",
  "Galaxy S9",
  "Galaxy S8+",
  "Galaxy S8",
  "Galaxy S7 edge",
  "Galaxy S7",
  "Galaxy S6 edge",
  "Galaxy Note 20 Ultra",
  "Galaxy Note 20",
  "Galaxy Note 10+",
  "Galaxy Note 10",
  "Galaxy Note 9",
  "Galaxy Note 8",
  "Galaxy Z Fold6",
  "Galaxy Z Fold5",
  "Galaxy Z Flip6",
  "Galaxy Z Flip5",
  "Galaxy A55",
  "Galaxy A54",
  "Galaxy A35",
  "Galaxy A34",
  "Galaxy A25",
  "Galaxy A15",
  "Galaxy A14",
] as const;

// Modèles regroupés par marque, dans l'ordre d'affichage.
export const BRANDS = [
  { brand: "Apple", models: APPLE },
  { brand: "Samsung", models: SAMSUNG },
] as const;

export const MODELS: readonly string[] = BRANDS.flatMap((group) => group.models);

export const CAPACITIES = [
  "16GB",
  "32GB",
  "64GB",
  "128GB",
  "256GB",
  "512GB",
  "1TB",
  "2TB",
] as const;

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
