// Cas de référence du calcul des parts d'une vente en dépôt.
// Utilisés par les tests unitaires ET par le test qui compare avec la base.
// Colonnes : prix de vente, prix d'achat, taux (points de base), part du dealer attendue.

export const CONSIGNMENT_CASES: readonly [number, number, number, number][] = [
  // Cas courants
  [250_000, 200_000, 2500, 12_500],
  [300_000, 200_000, 2500, 25_000],
  [520_000, 450_000, 3000, 21_000],
  [250_000, 200_000, 5000, 25_000],
  // Taux extrêmes
  [250_000, 200_000, 0, 0],
  [250_000, 200_000, 10_000, 50_000],
  [250_000, 0, 10_000, 250_000],
  // Marge nulle ou vente à perte : jamais de part négative
  [200_000, 200_000, 2500, 0],
  [180_000, 200_000, 2500, 0],
  [0, 200_000, 10_000, 0],
  [0, 0, 2500, 0],
  // Arrondi à l'unité inférieure
  [200_001, 200_000, 2500, 0],
  [200_003, 200_000, 2500, 0],
  [200_004, 200_000, 2500, 1],
  [200_007, 200_000, 2500, 1],
  [210_001, 200_000, 3333, 3_333],
  [200_100, 200_000, 3333, 33],
  [200_999, 200_000, 1250, 124],
  [200_001, 200_000, 9999, 0],
  [200_010, 200_000, 9999, 9],
  [200_001, 200_000, 1, 0],
  [300_000, 200_000, 1, 10],
  // Très grands montants : pas de perte de précision
  [900_000_000_000, 1, 9999, 899_909_999_999],
  [999_999_999_999, 0, 10_000, 999_999_999_999],
  [999_999_999_999, 0, 3333, 333_299_999_999],
];
