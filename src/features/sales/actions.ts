"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Le patron valide ou refuse une vente passée sous le prix plancher.
// La base vérifie elle-même que l'appelant est bien le patron.
export async function decideSale(shopId: string, saleId: string, approve: boolean) {
  const supabase = await createClient();
  await supabase.rpc("decide_sale", { p_sale_id: saleId, p_approve: approve });
  revalidatePath(`/s/${shopId}`, "layout");
}
