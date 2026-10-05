import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomInt, randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Variables Supabase absentes : lancez `npm run db:start` et remplissez .env.local.",
  );
}

// Les tests passent par la clé publique, comme l'application : ils
// vérifient ce qu'un vrai utilisateur peut lire ou écrire.
export function anonClient(): SupabaseClient {
  return createClient(url!, key!, { auth: { persistSession: false } });
}

export const TEST_PASSWORD = "motdepasse-de-test";

export function randomEmail() {
  return `test-${randomUUID()}@exemple.test`;
}

export function randomPhone() {
  return `+22990${randomInt(100000, 999999)}`;
}

type Credentials = { email: string } | { phone: string };

export async function signUpUser(name: string, credentials: Credentials) {
  const client = anonClient();
  const { data, error } = await client.auth.signUp({
    ...credentials,
    password: TEST_PASSWORD,
    options: { data: { name } },
  });
  if (error || !data.user || !data.session) {
    throw new Error(`Inscription de test impossible : ${error?.message}`);
  }
  return { client, id: data.user.id };
}
