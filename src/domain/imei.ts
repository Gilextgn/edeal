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

/**
 * Retrouve les IMEI dans un texte lu sur une photo (écran « À propos »,
 * écran *#06#, étiquette de la boîte) ou dans un code-barres.
 * Les chiffres d'un IMEI peuvent être séparés par des espaces
 * (« 35 693803 564380 9 ») et suivis d'un numéro de version (« / 01 »).
 * Seules les suites dont la clé de Luhn est correcte sont retenues : un
 * numéro de série ou une carte SIM ne passent pas pour un IMEI.
 */
export function extractImeis(text: string): string[] {
  const found: string[] = [];
  const add = (candidate: string) => {
    if (isValidImei(candidate) && !found.includes(candidate)) found.push(candidate);
  };

  for (const line of text.split(/\r?\n/)) {
    // Suites de chiffres, éventuellement séparés par un seul espace, point, tiret ou barre.
    for (const run of line.match(/\d(?:[ .\-/]?\d){14,}/g) ?? []) {
      const digits = run.replace(/\D/g, "");
      if (digits.length === 15) {
        add(digits);
      } else if (digits.length === 16 || digits.length === 17) {
        // IMEI suivi de son numéro de version logicielle (IMEISV).
        add(digits.slice(0, 15));
      } else if (digits.length === 30) {
        // Deux IMEI sur la même ligne (double SIM).
        add(digits.slice(0, 15));
        add(digits.slice(15));
      }
    }
  }
  return found;
}
