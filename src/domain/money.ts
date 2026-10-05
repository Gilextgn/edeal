// Tous les montants sont des entiers dans la plus petite unité de la devise
// (1 pour le FCFA, le centime pour l'euro). Aucun calcul en flottant.

const MAX_DIGITS = 12;

// Devise de l'espace perso d'un dealer (les boutiques ont la leur).
export const PERSONAL_CURRENCY = "XOF";

/** Nombre de décimales de la devise : 0 pour XOF, 2 pour EUR. */
export function currencyFractionDigits(currency: string): number {
  return (
    new Intl.NumberFormat("fr-FR", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 0
  );
}

/**
 * Convertit un montant saisi ("150 000", "1 250,50") en plus petite unité.
 * Retourne null si la saisie est invalide ou plus précise que la devise.
 */
export function parseAmountInput(raw: string, currency: string): number | null {
  const digits = currencyFractionDigits(currency);
  const compact = raw.replace(/[\s  ]/g, "");
  const match = /^(\d+)(?:[.,](\d+))?$/.exec(compact);
  if (!match) return null;

  const [, whole, fraction = ""] = match;
  if (fraction.length > digits || whole.length > MAX_DIGITS) return null;
  return Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0") || 0);
}

/** Valeur à remettre dans un champ de saisie : 150000 → "150000". */
export function amountToInput(amount: number, currency: string): string {
  const digits = currencyFractionDigits(currency);
  if (digits === 0) return String(amount);
  const text = String(amount).padStart(digits + 1, "0");
  return `${text.slice(0, -digits)}.${text.slice(-digits)}`;
}

/** Montant lisible : 250000 → « 250 000 F CFA ». */
export function formatMoney(amount: number, currency: string): string {
  const digits = currencyFractionDigits(currency);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    amount / 10 ** digits,
  );
}
