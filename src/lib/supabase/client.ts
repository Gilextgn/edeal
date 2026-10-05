import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

// Client navigateur : utilisé pour envoyer les photos et les constats en
// attente. Il partage la session (cookies) avec le serveur.
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
