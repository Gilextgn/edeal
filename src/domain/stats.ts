// Calculs du tableau de bord. Module pur ; dates en UTC, montants entiers.

// Période affichée : 7 derniers jours, 30 derniers jours, 12 derniers mois.
export const PERIODS = ["week", "month", "year"] as const;
export type Period = (typeof PERIODS)[number];

export function parsePeriod(raw: string | string[] | undefined): Period {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return PERIODS.includes(value as Period) ? (value as Period) : "month";
}

const DAYS = { week: 7, month: 30 } as const;
const MONTHS_IN_YEAR = 12;

const startOfDay = (now: Date, daysBack: number) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack));
const startOfMonth = (now: Date, monthsBack: number) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1));

/**
 * Début de la période affichée (aujourd'hui compris) et début de la période
 * précédente de même durée, pour mesurer l'évolution. Dates ISO.
 */
export function periodBounds(period: Period, now: Date) {
  if (period === "year") {
    return {
      start: startOfMonth(now, MONTHS_IN_YEAR - 1).toISOString(),
      previousStart: startOfMonth(now, 2 * MONTHS_IN_YEAR - 1).toISOString(),
    };
  }
  const days = DAYS[period];
  return {
    start: startOfDay(now, days - 1).toISOString(),
    previousStart: startOfDay(now, 2 * days - 1).toISOString(),
  };
}

type Sale = { created_at: string; sale_price: number };

// `key` : jour « AAAA-MM-JJ » ou mois « AAAA-MM ».
export type Bucket = { key: string; total: number; count: number };

function fill(buckets: Bucket[], sales: readonly Sale[], keyLength: number) {
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const sale of sales) {
    const bucket = byKey.get(sale.created_at.slice(0, keyLength));
    if (bucket) {
      bucket.total += sale.sale_price;
      bucket.count += 1;
    }
  }
  return buckets;
}

/**
 * Total et nombre de ventes pour chacun des `days` derniers jours (aujourd'hui
 * compris), du plus ancien au plus récent. Les jours sans vente valent zéro.
 */
export function dailyTotals(sales: readonly Sale[], days: number, now: Date): Bucket[] {
  const buckets: Bucket[] = [];
  for (let back = days - 1; back >= 0; back--) {
    buckets.push({ key: startOfDay(now, back).toISOString().slice(0, 10), total: 0, count: 0 });
  }
  return fill(buckets, sales, 10);
}

/** Même chose par mois, sur les `months` derniers mois (mois courant compris). */
export function monthlyTotals(sales: readonly Sale[], months: number, now: Date): Bucket[] {
  const buckets: Bucket[] = [];
  for (let back = months - 1; back >= 0; back--) {
    buckets.push({ key: startOfMonth(now, back).toISOString().slice(0, 7), total: 0, count: 0 });
  }
  return fill(buckets, sales, 7);
}

/** Barres du graphique pour la période : une par jour, ou une par mois sur l'année. */
export function periodTotals(sales: readonly Sale[], period: Period, now: Date): Bucket[] {
  return period === "year"
    ? monthlyTotals(sales, MONTHS_IN_YEAR, now)
    : dailyTotals(sales, DAYS[period], now);
}

/**
 * Évolution par rapport à la période précédente : 0.25 = +25 %.
 * null quand il n'y avait rien à comparer.
 */
export function relativeChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return (current - previous) / previous;
}
