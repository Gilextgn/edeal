"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/superadmin";

// Actions du superadmin. Chacune revérifie le rôle : une Server Action est
// appelable directement, sans passer par l'écran.

// Suspendre un compte : la personne ne peut plus se connecter (ses sessions
// en cours expirent sous une heure). Rien n'est effacé.
const SUSPENDED_FOR = "876000h"; // environ 100 ans

export async function setUserSuspended(userId: string, suspended: boolean) {
  const { userId: me, admin } = await requireSuperadmin();
  // On ne se bloque pas soi-même hors de la plateforme.
  if (userId === me) redirect(`/admin/users/${userId}?notice=self`);

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: suspended ? SUSPENDED_FOR : "none",
  });
  revalidatePath("/admin", "layout");
  redirect(`/admin/users/${userId}?notice=${error ? "failed" : suspended ? "suspended" : "restored"}`);
}

// Suspendre une boutique : plus aucun membre n'y a accès (voir la migration
// platform_admin) ; tout est conservé et revient à la réactivation.
export async function setShopSuspended(shopId: string, suspended: boolean) {
  const { admin } = await requireSuperadmin();
  const { error } = await admin
    .from("shops")
    .update({ suspended_at: suspended ? new Date().toISOString() : null })
    .eq("id", shopId);
  revalidatePath("/admin", "layout");
  redirect(`/admin/shops/${shopId}?notice=${error ? "failed" : suspended ? "suspended" : "restored"}`);
}
