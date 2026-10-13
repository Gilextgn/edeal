import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { adminClient } from "@/lib/supabase/admin";
import { USER_HEADER } from "@/lib/session-header";
import { createClient } from "@/lib/supabase/server";

// Espace superadmin. Ses écrans lisent toute la base avec la clé secrète,
// qui passe outre les règles d'accès : chacun d'eux, et chaque action,
// commence donc par requireSuperadmin. Qui est superadmin : la table
// platform_admins, modifiable seulement avec la clé secrète.

/** Vrai si ce compte est superadmin. */
export const isSuperadmin = cache(async (userId: string) => {
  const { data } = await adminClient()
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
});

/**
 * Pour les pages et actions de l'espace superadmin. Une personne connectée
 * qui n'est pas superadmin reçoit une page introuvable : l'espace n'existe
 * pas pour elle.
 */
export const requireSuperadmin = cache(async () => {
  let userId = (await headers()).get(USER_HEADER);
  // Dans une action (Server Action), on revérifie la session elle-même.
  if (!userId) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    userId = data?.claims?.sub ?? null;
  }
  if (!userId) redirect("/login");
  if (!(await isSuperadmin(userId))) notFound();
  return { userId, admin: adminClient() };
});
