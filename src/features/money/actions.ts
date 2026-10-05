"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildSchedule } from "@/domain/installments";
import { parseAmountInput, PERSONAL_CURRENCY } from "@/domain/money";
import { text, type FormState } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

// Ces actions ne vérifient pas elles-mêmes les droits : la base refuse toute
// opération que l'appelant n'a pas le droit de faire.

const KNOWN_ERRORS = new Set([
  "not_allowed",
  "sale_not_completed",
  "installments_exist",
  "invalid_schedule",
  "invalid_amount",
  "amount_exceeds_balance",
]);

function errorKey(error: { message: string }) {
  return KNOWN_ERRORS.has(error.message) ? `money.errors.${error.message}` : "errors.generic";
}

// Chemin de l'espace à rafraîchir : la boutique, ou l'espace perso.
const spacePath = (shopId: string | null) => (shopId ? `/s/${shopId}` : "/perso");

async function currencyOf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shopId: string | null,
) {
  if (!shopId) return PERSONAL_CURRENCY;
  const { data } = await supabase.from("shops").select("currency").eq("id", shopId).maybeSingle();
  return data?.currency ?? null;
}

export async function setInstallments(
  shopId: string | null,
  saleId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = {
    deposit: text(formData, "deposit"),
    count: text(formData, "count"),
    interval: text(formData, "interval"),
  };
  const supabase = await createClient();
  const currency = await currencyOf(supabase, shopId);
  const { data: sale } = await supabase
    .from("sales")
    .select("sale_price")
    .eq("id", saleId)
    .maybeSingle();
  if (!currency || !sale) return { error: "money.errors.not_allowed", values };

  const deposit = values.deposit === "" ? 0 : parseAmountInput(values.deposit, currency);
  const schedule =
    deposit === null
      ? null
      : buildSchedule({
          total: sale.sale_price,
          deposit,
          count: Number(values.count),
          intervalDays: Number(values.interval),
          today: new Date().toISOString().slice(0, 10),
        });
  if (!schedule) return { error: "money.errors.invalid_schedule", values };

  const { error } = await supabase.rpc("set_installments", {
    p_sale_id: saleId,
    p_installments: schedule.map((installment) => ({
      id: randomUUID(),
      amount: installment.amount,
      due_on: installment.dueOn,
      paid: installment.paid,
    })),
  });
  if (error) return { error: errorKey(error), values };

  revalidatePath(spacePath(shopId), "layout");
  return { success: "money.installmentsSaved" };
}

export async function setInstallmentPaid(
  shopId: string | null,
  installmentId: string,
  paid: boolean,
) {
  const supabase = await createClient();
  await supabase.rpc("set_installment_paid", {
    p_installment_id: installmentId,
    p_paid: paid,
  });
  revalidatePath(spacePath(shopId), "layout");
}

const METHODS = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER"];

export async function recordSettlement(
  shopId: string,
  membershipId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = { amount: text(formData, "amount"), method: text(formData, "method") };
  const supabase = await createClient();
  const currency = await currencyOf(supabase, shopId);
  if (!currency) return { error: "money.errors.not_allowed", values };

  const amount = parseAmountInput(values.amount, currency);
  if (amount === null || amount <= 0) return { error: "money.errors.invalid_amount", values };
  if (!METHODS.includes(values.method)) return { error: "money.errors.method_required", values };

  const { error } = await supabase.rpc("record_settlement", {
    p_settlement: {
      id: randomUUID(),
      membership_id: membershipId,
      amount,
      method: values.method,
      sale_ids: formData.getAll("sale_ids").map(String),
    },
  });
  if (error) return { error: errorKey(error), values };

  revalidatePath(spacePath(shopId), "layout");
  redirect(`/s/${shopId}/balances/${membershipId}?settled=1`);
}
