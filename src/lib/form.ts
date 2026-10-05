// État renvoyé par les Server Actions de formulaire.
// `error` et `success` sont des clés de messages/fr.json.
export type FormState = {
  error?: string;
  success?: string;
  values?: Record<string, string>;
} | null;

// Codes levés par les fonctions de la base (voir supabase/migrations).
const KNOWN_ERRORS = new Set([
  "not_authenticated",
  "not_patron",
  "invalid_role",
  "invalid_identifier",
  "invalid_rate",
  "already_member",
  "already_invited",
]);

export function errorKey(error: { message: string } | null): string {
  return error && KNOWN_ERRORS.has(error.message)
    ? `errors.${error.message}`
    : "errors.generic";
}

export function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}
