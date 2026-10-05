"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CAPACITIES, COLORS, isKnown, MODELS } from "@/domain/catalog";
import { isValidImei, normalizeImei } from "@/domain/imei";
import { parseAmountInput, PERSONAL_CURRENCY } from "@/domain/money";
import { text, type FormState } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { devicesPath } from "./scope";

// `shopId` vaut null dans l'espace perso. Il vient du navigateur : on ne lui
// fait pas confiance, la base refuse toute écriture hors des droits de l'appelant.

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function currencyOf(supabase: Supabase, shopId: string | null) {
  if (!shopId) return PERSONAL_CURRENCY;
  const { data } = await supabase
    .from("shops")
    .select("currency")
    .eq("id", shopId)
    .maybeSingle();
  return data?.currency ?? null;
}

function readDescription(formData: FormData, currency: string) {
  const values = {
    imei: text(formData, "imei"),
    model: text(formData, "model"),
    capacity: text(formData, "capacity"),
    color: text(formData, "color"),
    purchase_price: text(formData, "purchase_price"),
    target_price: text(formData, "target_price"),
  };
  const fail = (key: string) => ({ values, error: `devices.errors.${key}` }) as const;

  if (!isKnown(MODELS, values.model)) return fail("model_required");
  if (!isKnown(CAPACITIES, values.capacity)) return fail("capacity_required");
  if (!isKnown(COLORS, values.color)) return fail("color_required");

  const purchase_price = parseAmountInput(values.purchase_price, currency);
  const target_price = parseAmountInput(values.target_price, currency);
  if (purchase_price === null || target_price === null) return fail("price_invalid");

  return {
    values,
    row: {
      model: values.model,
      capacity: values.capacity,
      color: values.color,
      purchase_price,
      target_price,
    },
  } as const;
}

export async function createDevice(
  shopId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currency = await currencyOf(supabase, shopId);
  if (!user || !currency) return { error: "devices.errors.not_allowed" };

  const parsed = readDescription(formData, currency);
  if ("error" in parsed) return parsed;

  const imei = normalizeImei(parsed.values.imei);
  if (!isValidImei(imei)) {
    return { error: "devices.errors.imei_invalid", values: parsed.values };
  }

  const id = randomUUID();
  const { error } = await supabase.from("devices").insert({
    id,
    imei,
    ...parsed.row,
    ...(shopId ? { shop_id: shopId } : { owner_user_id: user.id }),
  });
  if (error) {
    const key =
      error.code === "23505" ? "imei_taken" : error.code === "42501" ? "not_allowed" : null;
    return {
      error: key ? `devices.errors.${key}` : "errors.generic",
      values: parsed.values,
    };
  }

  revalidatePath(devicesPath(shopId));
  redirect(`${devicesPath(shopId)}/${id}?created=1`);
}

export async function updateDevice(
  shopId: string | null,
  deviceId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const currency = await currencyOf(supabase, shopId);
  if (!currency) return { error: "devices.errors.not_allowed" };

  const parsed = readDescription(formData, currency);
  if ("error" in parsed) return parsed;

  const { data, error } = await supabase
    .from("devices")
    .update(parsed.row)
    .eq("id", deviceId)
    .select("id");
  if (error) return { error: "errors.generic", values: parsed.values };
  if (data.length === 0) {
    return { error: "devices.errors.not_allowed", values: parsed.values };
  }

  revalidatePath(devicesPath(shopId));
  redirect(`${devicesPath(shopId)}/${deviceId}`);
}

export async function setDeviceWithdrawn(
  shopId: string | null,
  deviceId: string,
  withdrawn: boolean,
) {
  const supabase = await createClient();
  await supabase.rpc("set_device_withdrawn", {
    p_device_id: deviceId,
    p_withdrawn: withdrawn,
  });
  revalidatePath(devicesPath(shopId));
}
