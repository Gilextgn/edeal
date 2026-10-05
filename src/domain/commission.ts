// Les taux sont stockés en points de base : 2500 = 25 %.
export const MAX_RATE_BPS = 10_000;

/**
 * Convertit un pourcentage saisi ("25", "12,5", "12.75") en points de base.
 * Calcul sur des entiers : aucun flottant. Retourne null si la saisie est
 * invalide ou hors de l'intervalle 0–100 %.
 */
export function percentInputToBps(raw: string): number | null {
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(raw.trim());
  if (!match) return null;

  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const bps = whole * 100 + fraction;
  return bps <= MAX_RATE_BPS ? bps : null;
}

/** Valeur à afficher dans le champ de saisie : 2500 → "25", 1250 → "12.5". */
export function bpsToPercentInput(bps: number): string {
  const whole = Math.trunc(bps / 100);
  const fraction = bps % 100;
  if (fraction === 0) return String(whole);
  return `${whole}.${String(fraction).padStart(2, "0").replace(/0$/, "")}`;
}
