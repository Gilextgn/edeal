import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type MemberRole = Database["public"]["Enums"]["member_role"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Utilisateur connecté et son profil. `cache` évite de refaire l'appel
// entre le layout et la page d'une même requête.
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, phone, email")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  return { supabase, profile };
});

// Boutique et rôle de l'utilisateur dans celle-ci. La base ne renvoie la
// boutique qu'à ses membres actifs : tout autre cas donne une page 404.
export const requireShop = cache(async (shopId: string) => {
  const { supabase, profile } = await requireUser();
  if (!UUID.test(shopId)) notFound();

  const [{ data: shop }, { data: membership }] = await Promise.all([
    supabase
      .from("shops")
      .select("id, name, phone, address, currency")
      .eq("id", shopId)
      .maybeSingle(),
    supabase
      .from("memberships")
      .select("id, role, commission_rate_bps")
      .eq("shop_id", shopId)
      .eq("user_id", profile.id)
      .maybeSingle(),
  ]);
  if (!shop || !membership) notFound();

  return { supabase, profile, shop, membership };
});

export async function requireOwner(shopId: string) {
  const context = await requireShop(shopId);
  if (context.membership.role !== "OWNER") notFound();
  return context;
}
