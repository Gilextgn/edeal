import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type { Database } from "@/lib/database.types";
import { isNetworkError, NETWORK_ERROR } from "@/lib/network";
import { USER_HEADER } from "@/lib/session-header";
import { createClient } from "@/lib/supabase/server";

export type MemberRole = Database["public"]["Enums"]["member_role"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Utilisateur connecté et son profil. `cache` évite de refaire l'appel
// entre le layout et la page d'une même requête.
//
// L'identité vient de l'en-tête posé par le proxy, qui a déjà vérifié la
// session pour cette requête : pas de second appel au service
// d'authentification. Le profil est ensuite lu avec le jeton de session ; si
// celui-ci ne correspondait pas, la base ne renverrait rien.
export const requireUser = cache(async () => {
  const userId = (await headers()).get(USER_HEADER);
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("users")
    .select("id, name, phone, email")
    .eq("id", userId)
    .maybeSingle();
  // Serveur injoignable : ce n'est pas une déconnexion. L'erreur remonte à la
  // page d'erreur (src/app/error.tsx), qui l'explique et propose de réessayer.
  if (error && isNetworkError(error)) throw new Error(NETWORK_ERROR);
  if (!profile) redirect("/login");

  return { supabase, profile };
});

// Boutique et rôle de l'utilisateur dans celle-ci. La base ne renvoie la
// boutique qu'à ses membres actifs : tout autre cas donne une page 404.
export const requireShop = cache(async (shopId: string) => {
  const userId = (await headers()).get(USER_HEADER);
  if (!userId) redirect("/login");
  if (!UUID.test(shopId)) notFound();

  // Profil, boutique et rôle sont demandés en même temps : un aller-retour
  // avec la base au lieu de deux.
  const supabase = await createClient();
  const [{ profile }, { data: shop, error: shopError }, { data: membership }] = await Promise.all([
    requireUser(),
    supabase
      .from("shops")
      .select("id, name, phone, address, currency")
      .eq("id", shopId)
      .maybeSingle(),
    supabase
      .from("memberships")
      .select("id, role, commission_rate_bps")
      .eq("shop_id", shopId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (shopError && isNetworkError(shopError)) throw new Error(NETWORK_ERROR);
  if (!shop || !membership) notFound();

  return { supabase, profile, shop, membership };
});

export async function requireOwner(shopId: string) {
  const context = await requireShop(shopId);
  if (context.membership.role !== "OWNER") notFound();
  return context;
}
