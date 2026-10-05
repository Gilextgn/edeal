// Pagination des listes. Module pur.

export const PAGE_SIZE = 10;

/** Numéro de page lu dans l'adresse (« ?page=3 ») : 1 si absent ou invalide. */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d{1,6}$/.test(value)) return 1;
  return Math.max(1, Number(value));
}

/** Indices (inclus) des lignes à demander à la base pour une page. */
export function pageRange(page: number, size = PAGE_SIZE) {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}

/** Ce qu'il faut pour afficher « 11–20 sur 43 » et les numéros de page. */
export function pageInfo(page: number, total: number, size = PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pageCount);
  return {
    page: current,
    pageCount,
    total,
    from: total === 0 ? 0 : (current - 1) * size + 1,
    to: Math.min(current * size, total),
  };
}

/** Texte de recherche lu dans l'adresse, nettoyé pour un filtre « contient ». */
export function parseSearch(raw: string | string[] | undefined): string {
  const value = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  // Retire les caractères qui ont un sens dans les filtres (%, _, virgule, parenthèses).
  return value.replace(/[%_,()\\]/g, " ").trim().slice(0, 60);
}
