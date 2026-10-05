// Calculs du tableau de bord. Module pur ; dates en UTC, montants entiers.

/** Début du mois courant et du mois précédent (ISO). */
export function monthBounds(now: Date) {
  const start = (offset: number) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)).toISOString();
  return { thisMonth: start(0), lastMonth: start(-1) };
}

export type DayTotal = { day: string; total: number; count: number };

/**
 * Total et nombre de ventes pour chacun des `days` derniers jours (aujourd'hui
 * compris), du plus ancien au plus récent. Les jours sans vente valent zéro.
 */
export function dailyTotals(
  sales: readonly { created_at: string; sale_price: number }[],
  days: number,
  now: Date,
): DayTotal[] {
  const series: DayTotal[] = [];
  for (let back = days - 1; back >= 0; back--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - back));
    series.push({ day: date.toISOString().slice(0, 10), total: 0, count: 0 });
  }
  const byDay = new Map(series.map((entry) => [entry.day, entry]));
  for (const sale of sales) {
    const entry = byDay.get(sale.created_at.slice(0, 10));
    if (entry) {
      entry.total += sale.sale_price;
      entry.count += 1;
    }
  }
  return series;
}

/**
 * Évolution par rapport à la période précédente : 0.25 = +25 %.
 * null quand il n'y avait rien à comparer.
 */
export function relativeChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}
