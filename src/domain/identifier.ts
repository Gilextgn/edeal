export type Identifier =
  | { kind: "email"; email: string }
  | { kind: "phone"; phone: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Interprète la saisie « téléphone ou e-mail » de l'écran de connexion.
 * Un numéro sans indicatif reçoit `defaultCountryCode` (ex. "229").
 * Le zéro initial d'un numéro local est conservé : il fait partie du numéro
 * dans plusieurs pays de la zone FCFA.
 */
export function parseIdentifier(
  raw: string,
  defaultCountryCode: string,
): Identifier | null {
  const value = raw.trim();

  if (value.includes("@")) {
    const email = value.toLowerCase();
    return EMAIL.test(email) ? { kind: "email", email } : null;
  }

  const compact = value.replace(/[\s.\-()]/g, "");
  if (!/^\+?\d+$/.test(compact)) return null;

  let phone: string;
  if (compact.startsWith("+")) phone = compact;
  else if (compact.startsWith("00")) phone = `+${compact.slice(2)}`;
  else phone = `+${defaultCountryCode}${compact}`;

  // Bénin : depuis fin 2024, les numéros ont 10 chiffres, l'ancien numéro à
  // 8 chiffres précédé de « 01 » (97 88 22 23 → 01 97 88 22 23). Une même
  // personne peut être saisie sous les deux formes : on ramène toujours
  // l'ancienne à la nouvelle, sinon l'invitation et le compte ne se
  // retrouveraient pas.
  const benin = /^\+229(\d{8})$/.exec(phone);
  if (benin) phone = `+22901${benin[1]}`;

  return E164.test(phone) ? { kind: "phone", phone } : null;
}
