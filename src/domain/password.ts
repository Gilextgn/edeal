// Règles de mot de passe. Module pur, utilisé à l'écran (aide en direct) et
// par le serveur (qui fait foi).

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordIssue =
  | "too_short"
  | "needs_letter"
  | "needs_digit"
  | "too_common"
  | "contains_identifier";

// Mots de passe que tout le monde essaie en premier.
const COMMON = new Set([
  "password",
  "password1",
  "password123",
  "motdepasse",
  "motdepasse1",
  "motdepasse123",
  "azerty123",
  "azertyuiop",
  "qwerty123",
  "qwertyuiop",
  "abcd1234",
  "abc12345",
  "a1234567",
  "admin123",
  "iphone123",
  "samsung123",
  "bonjour123",
  "soleil123",
  "jesus123",
  "iloveyou1",
  "welcome123",
  "edeal123",
]);

/**
 * Ce qui manque à un mot de passe pour être accepté (liste vide = accepté).
 * `identifier` est le téléphone ou l'e-mail du compte : le mot de passe ne
 * doit pas le contenir.
 */
export function passwordIssues(password: string, identifier = ""): PasswordIssue[] {
  const issues: PasswordIssue[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) issues.push("too_short");
  if (!/\p{L}/u.test(password)) issues.push("needs_letter");
  if (!/\d/.test(password)) issues.push("needs_digit");

  const lower = password.toLowerCase();
  // Une suite du même caractère, ou une suite de chiffres seule, se devine tout de suite.
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) issues.push("too_common");

  const digits = identifier.replace(/\D/g, "");
  const local = identifier.includes("@") ? identifier.split("@")[0].toLowerCase() : "";
  // On compare les 8 derniers chiffres : le numéro tel qu'on le compose, sans indicatif.
  if (
    (digits.length >= 8 && lower.includes(digits.slice(-8))) ||
    (local.length >= 4 && lower.includes(local))
  ) {
    issues.push("contains_identifier");
  }
  return issues;
}

/** Force affichée à l'écran : de 0 (très faible) à 4 (fort). Indicatif seulement. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (passwordIssues(password).length > 0) return password.length === 0 ? 0 : 1;
  let score = 2;
  if (password.length >= 12) score += 1;
  const kinds = [/\p{Ll}/u, /\p{Lu}/u, /\d/, /[^\p{L}\d]/u].filter((kind) => kind.test(password));
  if (kinds.length >= 3) score += 1;
  return score as 2 | 3 | 4;
}
