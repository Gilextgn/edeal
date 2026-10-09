"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { percentInputToBps } from "@/domain/commission";
import { parseIdentifier } from "@/domain/identifier";
import { env } from "@/lib/env";
import { errorKey, text, type FormState } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

// Ces actions ne vérifient pas elles-mêmes le rôle : la base refuse toute
// opération qui ne vient pas du patron de la boutique.

type AssignableRole = "DEALER" | "CASHIER";

function readRole(formData: FormData): AssignableRole | null {
  const role = text(formData, "role");
  return role === "DEALER" || role === "CASHIER" ? role : null;
}

export async function updateShop(
  shopId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = {
    name: text(formData, "name"),
    phone: text(formData, "phone"),
    address: text(formData, "address"),
  };
  if (!values.name) return { error: "errors.nameRequired", values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .update({
      name: values.name,
      phone: values.phone || null,
      address: values.address || null,
    })
    .eq("id", shopId)
    .select("id");
  if (error) return { error: "errors.generic", values };
  if (data.length === 0) return { error: "errors.not_owner", values };

  revalidatePath(`/s/${shopId}`, "layout");
  return { success: "common.saved", values };
}

export async function addMember(
  shopId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = {
    identifier: text(formData, "identifier"),
    role: text(formData, "role"),
    rate: text(formData, "rate"),
  };

  const identifier = parseIdentifier(
    values.identifier,
    env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE,
  );
  if (!identifier) return { error: "errors.invalid_identifier", values };

  const role = readRole(formData);
  if (!role) return { error: "errors.roleRequired", values };

  const rateBps = role === "DEALER" ? percentInputToBps(values.rate) : 0;
  if (rateBps === null) return { error: "errors.invalid_rate", values };

  const supabase = await createClient();
  // Le patron qui saisit son propre e-mail ou numéro : on le lui dit clairement,
  // plutôt que « cette personne fait déjà partie de la boutique ».
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const own =
    identifier.kind === "email"
      ? user?.email?.toLowerCase() === identifier.email.toLowerCase()
      : user?.phone?.replace(/^\+/, "") === identifier.phone.replace(/^\+/, "");
  if (own) return { error: "errors.own_account", values };

  const { data: outcome, error } = await supabase.rpc("add_member", {
    p_shop_id: shopId,
    p_role: role,
    p_commission_rate_bps: rateBps,
    ...(identifier.kind === "phone"
      ? { p_phone: identifier.phone }
      : { p_email: identifier.email }),
  });
  if (error) return { error: errorKey(error), values };

  revalidatePath(`/s/${shopId}`, "layout");
  redirect(`/s/${shopId}/members?added=${outcome}`);
}

export async function updateMember(
  shopId: string,
  membershipId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = {
    role: text(formData, "role"),
    rate: text(formData, "rate"),
    active: text(formData, "active"),
  };

  const role = readRole(formData);
  if (!role) return { error: "errors.roleRequired", values };

  const rateBps = role === "DEALER" ? percentInputToBps(values.rate) : 0;
  if (rateBps === null) return { error: "errors.invalid_rate", values };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_member", {
    p_membership_id: membershipId,
    p_role: role,
    p_commission_rate_bps: rateBps,
    p_active: values.active !== "false",
  });
  if (error) return { error: errorKey(error), values };

  revalidatePath(`/s/${shopId}`, "layout");
  redirect(`/s/${shopId}/members`);
}

export async function cancelInvitation(shopId: string, invitationId: string) {
  const supabase = await createClient();
  await supabase.from("invitations").delete().eq("id", invitationId);
  revalidatePath(`/s/${shopId}`, "layout");
}
