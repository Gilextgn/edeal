// Solde d'un dealer et répartition de ses règlements sur ses ventes.
// Module pur. La base applique la même règle à l'enregistrement
// (record_settlement) et fait foi ; tests/db/settlements.test.ts vérifie que
// les deux concordent.

export type SaleDue = {
  saleId: string;
  // Part de la boutique encore due sur cette vente (entier, plus petite unité).
  due: number;
  // Date de la vente (ISO) : les plus anciennes sont soldées d'abord.
  soldAt: string;
};

export type Allocation = { saleId: string; amount: number };

/**
 * Solde dû par un dealer : somme des parts boutique de ses ventes en dépôt,
 * moins la somme de ses règlements.
 */
export function dealerBalance(shopShares: readonly number[], settlements: readonly number[]) {
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
  return sum(shopShares) - sum(settlements);
}

/**
 * Répartit un règlement sur les ventes non soldées : d'abord celles que
 * l'utilisateur a désignées, puis les plus anciennes. Retourne null si le
 * montant est invalide ou dépasse ce que le dealer doit.
 */
export function allocateSettlement(
  amount: number,
  dues: readonly SaleDue[],
  preferredSaleIds: readonly string[] = [],
): Allocation[] | null {
  const unpaid = dues.filter((d) => d.due > 0);
  const total = unpaid.reduce((sum, d) => sum + d.due, 0);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > total) return null;

  const preferred = new Set(preferredSaleIds);
  const ordered = [...unpaid].sort(
    (a, b) =>
      Number(preferred.has(b.saleId)) - Number(preferred.has(a.saleId)) ||
      a.soldAt.localeCompare(b.soldAt) ||
      a.saleId.localeCompare(b.saleId),
  );

  const allocations: Allocation[] = [];
  let left = amount;
  for (const { saleId, due } of ordered) {
    if (left === 0) break;
    const part = Math.min(left, due);
    allocations.push({ saleId, amount: part });
    left -= part;
  }
  return allocations;
}
