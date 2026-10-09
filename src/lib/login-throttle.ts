import { createHash } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";

// Frein contre les essais de mots de passe en série (voir la migration
// login_throttle). Réservé au serveur : passe par la clé secrète.

// L'identifiant (téléphone ou e-mail normalisé) n'est jamais stocké en clair.
const fingerprint = (identifier: string) =>
  createHash("sha256").update(identifier.toLowerCase()).digest("hex");

/** Secondes à attendre avant un nouvel essai de connexion (0 = autorisé). */
export async function loginLockSeconds(identifier: string): Promise<number> {
  const { data, error } = await adminClient().rpc("login_lock_seconds", {
    p_identifier_hash: fingerprint(identifier),
  });
  if (error) throw new Error(`login_lock_seconds : ${error.message}`);
  return data ?? 0;
}

export async function recordLoginAttempt(identifier: string, succeeded: boolean) {
  const { error } = await adminClient().rpc("record_login_attempt", {
    p_identifier_hash: fingerprint(identifier),
    p_succeeded: succeeded,
  });
  if (error) throw new Error(`record_login_attempt : ${error.message}`);
}
