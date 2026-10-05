// Partage du prix d'une vente entre la boutique et le vendeur.
//
// Module pur : aucun accès à la base ni au réseau. La base refait le même
// calcul au moment d'enregistrer la vente (c'est elle qui fait foi) ; ce
// module sert à afficher l'aperçu à l'écran. tests/db/shares.test.ts vérifie
// que les deux donnent exactement le même résultat.
//
// Tous les montants sont des entiers dans la plus petite unité de la devise.

export type ShareInput = {
  salePrice: number;
  purchasePrice: number;
  // Points de base : 2500 = 25 %.
  commissionRateBps: number;
};

export type Shares = { dealerShare: number; shopShare: number };

// Une stratégie de rémunération décide de la part du dealer sur une vente
// en dépôt. Pour en changer, écrire une autre fonction de ce type.
export type CompensationStrategy = (input: ShareInput) => number;

/**
 * Stratégie par défaut : le dealer touche un pourcentage de la marge
 * (prix de vente − prix d'achat), arrondi à l'unité inférieure.
 * Vente à perte : sa part est 0, jamais négative.
 */
export const marginCommission: CompensationStrategy = ({
  salePrice,
  purchasePrice,
  commissionRateBps,
}) => {
  const margin = BigInt(salePrice) - BigInt(purchasePrice);
  if (margin <= 0n) return 0;
  // BigInt : le produit taux × marge peut dépasser la précision des nombres JS.
  return Number((BigInt(commissionRateBps) * margin) / 10_000n);
};

export type SaleKind =
  // Appareil et client du dealer : la boutique ne touche rien.
  | "PERSONAL"
  // Appareil de la boutique vendu par le patron ou le caissier : pas de commission.
  | "DIRECT"
  // Appareil confié à un dealer : commission selon la stratégie.
  | "CONSIGNMENT";

export function computeShares(
  kind: SaleKind,
  input: ShareInput,
  strategy: CompensationStrategy = marginCommission,
): Shares {
  assertValid(input);
  if (kind === "PERSONAL") return { dealerShare: input.salePrice, shopShare: 0 };
  if (kind === "DIRECT") return { dealerShare: 0, shopShare: input.salePrice };

  const dealerShare = strategy(input);
  if (!Number.isSafeInteger(dealerShare) || dealerShare < 0 || dealerShare > input.salePrice) {
    throw new RangeError("La part du dealer doit être comprise entre 0 et le prix de vente.");
  }
  return { dealerShare, shopShare: input.salePrice - dealerShare };
}

/** Sous le prix plancher, la vente attend la validation du patron. */
export function needsApproval(salePrice: number, floorPrice: number): boolean {
  return salePrice < floorPrice;
}

function assertValid({ salePrice, purchasePrice, commissionRateBps }: ShareInput) {
  for (const amount of [salePrice, purchasePrice]) {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new RangeError("Les montants doivent être des entiers positifs.");
    }
  }
  if (
    !Number.isInteger(commissionRateBps) ||
    commissionRateBps < 0 ||
    commissionRateBps > 10_000
  ) {
    throw new RangeError("Le taux doit être compris entre 0 et 10000 points de base.");
  }
}
