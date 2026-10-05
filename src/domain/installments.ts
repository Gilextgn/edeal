// Échéancier d'une vente payée en plusieurs fois. Module pur.
// Montants entiers dans la plus petite unité de la devise ; dates AAAA-MM-JJ.

export type ScheduledInstallment = { amount: number; dueOn: string; paid: boolean };

export type ScheduleInput = {
  // Prix de vente à répartir.
  total: number;
  // Acompte versé aujourd'hui (0 = pas d'acompte).
  deposit: number;
  // Nombre d'échéances restantes après l'acompte.
  count: number;
  // Date du jour.
  today: string;
  // Nombre de jours entre deux échéances.
  intervalDays: number;
};

export const MAX_INSTALLMENTS = 12;

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

/**
 * Construit l'échéancier : l'acompte éventuel (payé aujourd'hui), puis le
 * reste en parts égales. Le reste de la division va sur la dernière échéance,
 * pour que la somme soit exactement le prix de vente.
 * Retourne null si les données sont incohérentes.
 */
export function buildSchedule({
  total,
  deposit,
  count,
  today,
  intervalDays,
}: ScheduleInput): ScheduledInstallment[] | null {
  const integers = [total, deposit, count, intervalDays];
  if (!integers.every(Number.isSafeInteger)) return null;
  if (total <= 0 || deposit < 0 || deposit >= total) return null;
  if (count < 1 || intervalDays < 1) return null;
  if (count + (deposit > 0 ? 1 : 0) > MAX_INSTALLMENTS) return null;

  const remaining = total - deposit;
  // Chaque échéance doit valoir au moins une unité.
  if (remaining < count) return null;
  const share = Math.floor(remaining / count);

  const schedule: ScheduledInstallment[] = [];
  if (deposit > 0) schedule.push({ amount: deposit, dueOn: today, paid: true });
  for (let i = 1; i <= count; i++) {
    schedule.push({
      amount: i === count ? remaining - share * (count - 1) : share,
      dueOn: addDays(today, i * intervalDays),
      paid: false,
    });
  }
  return schedule;
}

/** Une échéance est en retard si elle n'est pas payée et que sa date est passée. */
export function isOverdue(dueOn: string, paidOn: string | null, today: string): boolean {
  return paidOn === null && dueOn < today;
}

/** Reste à payer par le client sur un échéancier. */
export function outstanding(
  installments: readonly { amount: number; paid_on: string | null }[],
): number {
  return installments
    .filter((installment) => installment.paid_on === null)
    .reduce((sum, installment) => sum + installment.amount, 0);
}
