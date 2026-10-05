// Chiffre de contrôle de Luhn pour les 14 premiers chiffres d'un IMEI.
export function imeiCheckDigit(first14: string): number {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = Number(first14[i]);
    // En partant de la gauche, les positions paires (2e, 4e…) sont doublées.
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return (10 - (sum % 10)) % 10;
}

/** Retire espaces, tirets et points d'un IMEI saisi ou collé. */
export function normalizeImei(raw: string): string {
  return raw.replace(/[\s.\-/]/g, "");
}

/** Un IMEI valide : 15 chiffres dont le dernier est la clé de Luhn. */
export function isValidImei(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  return imeiCheckDigit(imei.slice(0, 14)) === Number(imei[14]);
}
