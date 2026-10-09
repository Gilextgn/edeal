import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

// Accès d'administration à Supabase, réservé au serveur : il utilise la clé
// secrète, qui passe outre les règles d'accès. Elle ne doit jamais être
// envoyée au navigateur ni commitée, et ce fichier ne s'importe que depuis du
// code serveur (Server Actions, `src/lib`).
export function adminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SECRET_KEY manquante : voir .env.example.");
  }
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
