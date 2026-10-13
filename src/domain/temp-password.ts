// Mot de passe provisoire donné par le superadmin à un nouveau compte. Il
// doit se dicter ou se recopier sans erreur : lettres minuscules sans les
// caractères qui se confondent (i, l, o), et des chiffres sans 0 ni 1.
// Exemple : « kamu4827re ». La personne le remplace à sa première connexion.

const LETTERS = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";

// Entier aléatoire dans [0, max), tiré d'une source cryptographique.
function cryptoInt(max: number) {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] % max;
}

export function temporaryPassword(random: (max: number) => number = cryptoInt): string {
  const pick = (set: string, count: number) =>
    Array.from({ length: count }, () => set[random(set.length)]).join("");
  return `${pick(LETTERS, 4)}${pick(DIGITS, 4)}${pick(LETTERS, 2)}`;
}
