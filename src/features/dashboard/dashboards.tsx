import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { icons } from "@/components/icons";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";
import { formatMoney, PERSONAL_CURRENCY } from "@/domain/money";
import type { MemberRole } from "@/lib/session";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type Alert = { key: string; href: string; title: string; detail: string };

const today = () => new Date().toISOString().slice(0, 10);

function monthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </Card>
  );
}

function Alerts({ title, empty, alerts }: { title: string; empty: string; alerts: Alert[] }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {alerts.length === 0 ? (
        <Card className="text-muted lg:max-w-xl">{empty}</Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {alerts.map((alert) => (
            <li key={alert.key}>
              <Link
                href={alert.href}
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{alert.title}</span>
                  <span className="block text-sm text-danger">{alert.detail}</span>
                </span>
                <span className="text-muted">{icons.chevron}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Échéances non payées des ventes visibles, avec le modèle de l'appareil.
function unpaidInstallments(supabase: Supabase) {
  return supabase
    .from("installments")
    .select("id, amount, due_on, sale_id, sales!inner(shop_id, type, seller_user_id, devices(model))")
    .is("paid_on", null);
}

// ---------- Tableau de bord d'une boutique ----------
// Chaque requête ne renvoie que ce que le rôle a le droit de voir : pour un
// dealer, les ventes et dépôts comptés ici sont uniquement les siens.

export async function ShopDashboard({
  supabase,
  shop,
  role,
  commissionRateBps,
}: {
  supabase: Supabase;
  shop: { id: string; name: string; currency: string };
  role: MemberRole;
  commissionRateBps: number;
}) {
  const t = await getTranslations();
  const format = await getFormatter();
  const money = (amount: number) => formatMoney(amount, shop.currency);
  const day = (date: string) => format.dateTime(new Date(date), { dateStyle: "long" });
  const base = `/s/${shop.id}`;
  const isDealer = role === "DEALER";

  const [stock, monthSales, pendingSales, consignments, installments, balances] =
    await Promise.all([
      isDealer
        ? null
        : supabase
            .from("devices")
            .select("purchase_price")
            .eq("shop_id", shop.id)
            .in("status", ["IN_STOCK", "CONSIGNED"]),
      supabase
        .from("sales")
        .select("sale_price, purchase_price, shop_share, dealer_share")
        .eq("shop_id", shop.id)
        .eq("status", "COMPLETED")
        .gte("created_at", monthStart()),
      supabase
        .from("sales")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shop.id)
        .eq("status", "PENDING_APPROVAL"),
      role === "CASHIER"
        ? null
        : supabase
            .from("consignments")
            .select(
              "id, due_on, device_id, devices(model), users!consignments_dealer_user_id_fkey(name)",
            )
            .eq("shop_id", shop.id)
            .eq("status", "ACTIVE"),
      unpaidInstallments(supabase).eq("sales.shop_id", shop.id),
      supabase.rpc("dealer_balances", { p_shop_id: shop.id }),
    ]);

  const sales = monthSales.data ?? [];
  const active = consignments?.data ?? [];
  const unpaid = installments.data ?? [];
  const owedByDealers = sum((balances.data ?? []).map((b) => b.balance));
  const toReview = pendingSales.count ?? 0;

  const alerts: Alert[] = [
    ...(role === "OWNER" && toReview > 0
      ? [
          {
            key: "pending",
            href: `${base}/sales`,
            title: t("dashboard.pendingSales", { count: toReview }),
            detail: t("dashboard.pendingSalesDetail"),
          },
        ]
      : []),
    ...active
      .filter((c) => c.due_on < today())
      .map((c) => ({
        key: c.id,
        href: isDealer ? `${base}/consignments/${c.id}` : `${base}/devices/${c.device_id}`,
        title: isDealer
          ? (c.devices?.model ?? "")
          : t("dashboard.consignmentOf", {
              model: c.devices?.model ?? "",
              dealer: c.users?.name ?? "",
            }),
        detail: t("dashboard.consignmentOverdue", { date: day(c.due_on) }),
      })),
    ...unpaid
      .filter((i) => i.due_on < today())
      .map((i) => ({
        key: i.id,
        href: `${base}/sales/${i.sale_id}`,
        title: `${i.sales.devices?.model ?? ""} · ${money(i.amount)}`,
        detail: t("dashboard.installmentOverdue", { date: day(i.due_on) }),
      })),
  ];

  return (
    <>
      <PageHeader
        title={shop.name}
        subtitle={t("dashboard.thisMonth")}
        action={
          isDealer ? (
            <ButtonLink href={`${base}/consignments`} className="w-full sm:w-auto">
              {t("consignments.mineTitle")}
            </ButtonLink>
          ) : (
            <ButtonLink href={`${base}/devices`} className="w-full sm:w-auto">
              {t("shop.viewStock")}
            </ButtonLink>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stock ? (
          <Stat
            label={t("dashboard.stock")}
            value={stock.data?.length ?? 0}
            hint={
              role === "OWNER"
                ? t("dashboard.stockValue", {
                    value: money(sum((stock.data ?? []).map((d) => d.purchase_price))),
                  })
                : undefined
            }
          />
        ) : null}
        {isDealer ? (
          <Stat label={t("shop.myConsignments")} value={active.length} />
        ) : null}
        <Stat
          label={t(isDealer ? "dashboard.mySales" : "dashboard.sales")}
          value={sales.length}
          hint={t("dashboard.revenue", { value: money(sum(sales.map((s) => s.sale_price))) })}
        />
        {role === "OWNER" ? (
          <Stat
            label={t("dashboard.profit")}
            value={money(sum(sales.map((s) => (s.shop_share ?? 0) - s.purchase_price)))}
            hint={t("dashboard.profitHint")}
          />
        ) : null}
        {isDealer ? (
          <Stat
            label={t("dashboard.myEarnings")}
            value={money(sum(sales.map((s) => s.dealer_share ?? 0)))}
            hint={t("dashboard.myRate", {
              rate: format.number(commissionRateBps / 10000, {
                style: "percent",
                maximumFractionDigits: 2,
              }),
            })}
          />
        ) : null}
        <Link
          href={`${base}/balances`}
          className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Stat
            label={t(isDealer ? "dashboard.myDebt" : "dashboard.dealersDebt")}
            value={money(owedByDealers)}
            hint={t("dashboard.seeBalances")}
          />
        </Link>
        <Stat
          label={t("dashboard.customersDebt")}
          value={money(sum(unpaid.map((i) => i.amount)))}
          hint={t("dashboard.customersDebtHint")}
        />
      </div>

      <Alerts
        title={t("dashboard.alerts")}
        empty={t("dashboard.noAlerts")}
        alerts={alerts}
      />
    </>
  );
}

// ---------- Tableau de bord de l'espace perso ----------

export async function PersonalDashboard({
  supabase,
  userId,
}: {
  supabase: Supabase;
  userId: string;
}) {
  const t = await getTranslations();
  const format = await getFormatter();
  const money = (amount: number) => formatMoney(amount, PERSONAL_CURRENCY);

  const [stock, monthSales, installments] = await Promise.all([
    supabase
      .from("devices")
      .select("purchase_price")
      .eq("owner_user_id", userId)
      .eq("status", "IN_STOCK"),
    supabase
      .from("sales")
      .select("sale_price, purchase_price")
      .eq("type", "PERSONAL")
      .eq("seller_user_id", userId)
      .eq("status", "COMPLETED")
      .gte("created_at", monthStart()),
    unpaidInstallments(supabase)
      .eq("sales.type", "PERSONAL")
      .eq("sales.seller_user_id", userId),
  ]);

  const sales = monthSales.data ?? [];
  const unpaid = installments.data ?? [];
  const alerts: Alert[] = unpaid
    .filter((i) => i.due_on < today())
    .map((i) => ({
      key: i.id,
      href: `/perso/sales/${i.sale_id}`,
      title: `${i.sales.devices?.model ?? ""} · ${money(i.amount)}`,
      detail: t("dashboard.installmentOverdue", {
        date: format.dateTime(new Date(i.due_on), { dateStyle: "long" }),
      }),
    }));

  return (
    <>
      <PageHeader
        title={t("personal.title")}
        subtitle={t("dashboard.thisMonth")}
        action={
          <ButtonLink href="/perso/devices" className="w-full sm:w-auto">
            {t("personal.viewDevices")}
          </ButtonLink>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Badge tone="primary">{t("personal.privateBadge")}</Badge>
        <p className="text-sm text-muted">{t("personal.privateNote")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={t("dashboard.stock")}
          value={stock.data?.length ?? 0}
          hint={t("dashboard.stockValue", {
            value: money(sum((stock.data ?? []).map((d) => d.purchase_price))),
          })}
        />
        <Stat
          label={t("dashboard.mySales")}
          value={sales.length}
          hint={t("dashboard.revenue", { value: money(sum(sales.map((s) => s.sale_price))) })}
        />
        <Stat
          label={t("dashboard.profit")}
          value={money(sum(sales.map((s) => s.sale_price - s.purchase_price)))}
          hint={t("dashboard.personalProfitHint")}
        />
        <Stat
          label={t("dashboard.customersDebt")}
          value={money(sum(unpaid.map((i) => i.amount)))}
          hint={t("dashboard.customersDebtHint")}
        />
      </div>

      <Alerts
        title={t("dashboard.alerts")}
        empty={t("dashboard.noAlerts")}
        alerts={alerts}
      />
    </>
  );
}
