"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorKey, text, type FormState } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

export async function createShop(
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
  const { data: shopId, error } = await supabase.rpc("create_shop", {
    p_name: values.name,
    p_phone: values.phone,
    p_address: values.address,
  });
  if (error || !shopId) return { error: errorKey(error), values };

  redirect(`/s/${shopId}`);
}

export async function updateProfile(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = { name: text(formData, "name") };
  if (!values.name) return { error: "errors.nameRequired", values };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "errors.not_authenticated", values };

  const { error } = await supabase
    .from("users")
    .update({ name: values.name })
    .eq("id", user.id);
  if (error) return { error: "errors.generic", values };

  revalidatePath("/", "layout");
  return { success: "common.saved", values };
}
