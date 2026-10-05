import { getFormatter, getTranslations } from "next-intl/server";
import { cache } from "react";
import type { ShellAlert } from "@/components/shell";
import { formatMoney, PERSONAL_CURRENCY } from "@/domain/money";
import type { MemberRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

// Ce qui demande l'attention de l'utilisateur : ventes à valider, dépôts et
// échéances en retard. Sert à la cloche de la barre du haut et au tableau de bord.
// La base ne renvoie que ce que le rôle a le droit de voir.

const today = () => new Date().toISOString().slice(0, 10);

type Supabase = Awaited<ReturnType<typeof createClient>>;

function overdueInstallments(supabase: Supabase) {
  return supabase
    .from("installments")
    .select("id, amount, due_on, sale_id, sales!inner(shop_id, type, seller_user_id, devices(model))")
    .is("paid_on", null)
    .lt("due_on", today())
    .order("due_on");
}

export const loadShopAlerts = cache(
  async (shopId: string, currency: string, role: MemberRole): Promise<ShellAlert[]> => {
    const supabase = await createClient();
    const t = await getTranslations("dashboard");
    const format = await getFormatter();
    const day = (date: string) => format.dateTime(new Date(date), { dateStyle: "long" });
    const base = `/s/${shopId}`;
    const isDealer = role === "DEALER";

    const [pending, consignments, installments] = await Promise.all([
      role === "OWNER"
        ? supabase
            .from("sales")
            .select("id", { count: "exact", head: true })
            .eq("shop_id", shopId)
            .eq("status", "PENDING_APPROVAL")
        : null,
      role === "CASHIER"
        ? null
        : supabase
            .from("consignments")
            .select(
              "id, due_on, device_id, devices(model), users!consignments_dealer_user_id_fkey(name)",
            )
            .eq("shop_id", shopId)
            .eq("status", "ACTIVE")
            .lt("due_on", today())
            .order("due_on"),
      overdueInstallments(supabase).eq("sales.shop_id", shopId),
    ]);

    return [
      ...(pending?.count
        ? [
            {
              key: "pending",
              href: `${base}/sales`,
              title: t("pendingSales", { count: pending.count }),
              detail: t("pendingSalesDetail"),
            },
          ]
        : []),
      ...(consignments?.data ?? []).map((c) => ({
        key: c.id,
        href: isDealer ? `${base}/consignments/${c.id}` : `${base}/devices/${c.device_id}`,
        title: isDealer
          ? (c.devices?.model ?? "")
          : t("consignmentOf", { model: c.devices?.model ?? "", dealer: c.users?.name ?? "" }),
        detail: t("consignmentOverdue", { date: day(c.due_on) }),
      })),
      ...(installments.data ?? []).map((i) => ({
        key: i.id,
        href: `${base}/sales/${i.sale_id}`,
        title: `${i.sales.devices?.model ?? ""} · ${formatMoney(i.amount, currency)}`,
        detail: t("installmentOverdue", { date: day(i.due_on) }),
      })),
    ];
  },
);

export const loadPersonalAlerts = cache(async (userId: string): Promise<ShellAlert[]> => {
  const supabase = await createClient();
  const t = await getTranslations("dashboard");
  const format = await getFormatter();

  const { data } = await overdueInstallments(supabase)
    .eq("sales.type", "PERSONAL")
    .eq("sales.seller_user_id", userId);

  return (data ?? []).map((i) => ({
    key: i.id,
    href: `/perso/sales/${i.sale_id}`,
    title: `${i.sales.devices?.model ?? ""} · ${formatMoney(i.amount, PERSONAL_CURRENCY)}`,
    detail: t("installmentOverdue", {
      date: format.dateTime(new Date(i.due_on), { dateStyle: "long" }),
    }),
  }));
});
