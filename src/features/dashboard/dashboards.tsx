import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { icons, type IconName } from "@/components/icons";
import type { ShellAlert } from "@/components/shell";
import { Badge, Card, SectionTitle, TableCard, Td, Th, focusRing } from "@/components/ui";
import { currencyFractionDigits, formatMoney, PERSONAL_CURRENCY } from "@/domain/money";
import { dailyTotals, monthBounds, relativeChange } from "@/domain/stats";
import type { MemberRole } from "@/lib/session";
import type { createClient } from "@/lib/supabase/server";
import { loadPersonalAlerts, loadShopAlerts } from "./alerts";
import { BarChart } from "./bar-chart";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Translate = Awaited<ReturnType<typeof getTranslations>>;

const CHART_DAYS = 14;

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

type Kpi = {
  icon: IconName;
  tone: "primary" | "accent" | "success" | "warning";
  label: string;
  value: string;
  note?: string;
  // Évolution (0.25 = +25 %) affichée en pastille ; absente = pas de pastille.
  change?: number | null;
  href?: string;
};

const chipTones = {
  primary: "bg-primary-soft text-on-primary-soft",
  accent: "bg-accent-soft text-warning",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
};

async function KpiCard({ kpi }: { kpi: Kpi }) {
  const format = await getFormatter();
  const body = (
    <Card className="flex h-full flex-col gap-3 transition hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <span
          aria-hidden
          className={`inline-flex size-11 items-center justify-center rounded-xl ${chipTones[kpi.tone]}`}
        >
          {icons[kpi.icon]}
        </span>
        {kpi.change !== undefined && kpi.change !== null ? (
          <Badge tone={kpi.change >= 0 ? "success" : "danger"}>
            {format.number(kpi.change, {
              style: "percent",
              maximumFractionDigits: 0,
              signDisplay: "always",
            })}
          </Badge>
        ) : null}
      </div>
      <div>
        <p className="text-sm font-medium text-muted">{kpi.label}</p>
        <p className="mt-0.5 text-2xl font-extrabold tracking-tight xl:text-3xl">{kpi.value}</p>
      </div>
      {kpi.note ? <p className="mt-auto text-sm text-muted">{kpi.note}</p> : null}
    </Card>
  );
  return kpi.href ? (
    <Link href={kpi.href} className={`block rounded-2xl ${focusRing}`}>
      {body}
    </Link>
  ) : (
    body
  );
}

type RecentSale = {
  id: string;
  status: "PENDING_APPROVAL" | "COMPLETED" | "REJECTED" | "CANCELLED";
  sale_price: number;
  created_at: string;
  devices: { model: string } | null;
  customers: { name: string } | null;
};

const saleTones = {
  PENDING_APPROVAL: "warning",
  COMPLETED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
} as const;

// Mise en page commune à tous les tableaux de bord : accueil, indicateurs,
// graphique des ventes + panneau latéral, dernières ventes + alertes.
async function DashboardView({
  t,
  greeting,
  subtitle,
  kpis,
  currency,
  monthSales,
  recentSales,
  salesHref,
  alerts,
  side,
}: {
  t: Translate;
  greeting: string;
  subtitle: string;
  kpis: Kpi[];
  currency: string;
  monthSales: { created_at: string; sale_price: number }[];
  recentSales: RecentSale[];
  salesHref: string;
  alerts: ShellAlert[];
  side: ReactNode;
}) {
  const format = await getFormatter();
  const money = (amount: number) => formatMoney(amount, currency);
  const series = dailyTotals(monthSales, CHART_DAYS, new Date());
  const hasSales = series.some((entry) => entry.total > 0);

  return (
    <>
      <div className="mb-6 animate-rise">
        <h1 className="font-display text-4xl leading-tight lg:text-5xl">{greeting}</h1>
        <p className="mt-1 text-muted">{subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="font-semibold">{t("dashboard.chartTitle")}</p>
          <p className="mb-3 text-sm text-muted">{t("dashboard.chartSubtitle")}</p>
          {hasSales ? (
            <BarChart
              caption={t("dashboard.chartTitle")}
              divisor={10 ** currencyFractionDigits(currency)}
              points={series.map((entry) => {
                const date = new Date(entry.day);
                return {
                  label: format.dateTime(date, { day: "numeric", month: "short", timeZone: "UTC" }),
                  detail: t("dashboard.chartDay", {
                    date: format.dateTime(date, { dateStyle: "long", timeZone: "UTC" }),
                    amount: money(entry.total),
                    count: entry.count,
                  }),
                  value: entry.total,
                };
              })}
            />
          ) : (
            <p className="rounded-xl bg-surface-2 p-6 text-center text-sm text-muted">
              {t("dashboard.chartEmpty")}
            </p>
          )}
        </Card>
        <div className="flex flex-col gap-4">{side}</div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <SectionTitle>{t("dashboard.recentSales")}</SectionTitle>
            <Link href={salesHref} className={`text-sm font-semibold text-primary ${focusRing}`}>
              {t("dashboard.seeAll")}
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <Card className="text-muted">{t("dashboard.noSales")}</Card>
          ) : (
            <TableCard>
              <thead>
                <tr>
                  <Th>{t("devices.device")}</Th>
                  <Th className="hidden sm:table-cell">{t("sales.customer")}</Th>
                  <Th className="text-right">{t("sales.priceLabel")}</Th>
                  <Th className="hidden md:table-cell">{t("devices.statusLabel")}</Th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-surface-2/60">
                    <Td>
                      <p className="font-semibold">{sale.devices?.model}</p>
                      <p className="text-xs text-muted">
                        {format.dateTime(new Date(sale.created_at), { dateStyle: "medium" })}
                      </p>
                    </Td>
                    <Td className="hidden sm:table-cell">{sale.customers?.name}</Td>
                    <Td className="text-right font-semibold">{money(sale.sale_price)}</Td>
                    <Td className="hidden md:table-cell">
                      <Badge tone={saleTones[sale.status]}>{t(`sales.status.${sale.status}`)}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableCard>
          )}
        </section>

        <section>
          <SectionTitle>{t("dashboard.alerts")}</SectionTitle>
          {alerts.length === 0 ? (
            <Card className="flex items-center gap-3 text-muted">
              <span className="text-success">{icons.check}</span>
              {t("dashboard.noAlerts")}
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {alerts.map((alert) => (
                <li key={alert.key}>
                  <Link
                    href={alert.href}
                    className={`flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card transition hover:border-danger ${focusRing}`}
                  >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
                      {icons.alert}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{alert.title}</span>
                      <span className="block text-xs text-muted">{alert.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

// Ligne « libellé — valeur » avec une barre de proportion (une seule teinte).
function ShareRow({ label, value, ratio }: { label: string; value: string; ratio: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-surface-2">
        <div
          className="h-2 rounded-full bg-chart"
          style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link
      href={href}
      className={`flex min-h-12 items-center gap-3 rounded-xl border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-2 ${focusRing}`}
    >
      <span className="text-primary">{icons[icon]}</span>
      <span className="flex-1">{label}</span>
      <span className="text-muted">{icons.chevron}</span>
    </Link>
  );
}

// ---------- Tableau de bord d'une boutique, selon le profil ----------
// Chaque requête ne renvoie que ce que le rôle a le droit de voir : pour un
// dealer, les ventes et dépôts comptés ici sont uniquement les siens.

export async function ShopDashboard({
  supabase,
  shop,
  role,
  userName,
  commissionRateBps,
}: {
  supabase: Supabase;
  shop: { id: string; name: string; currency: string };
  role: MemberRole;
  userName: string;
  commissionRateBps: number;
}) {
  const t = await getTranslations();
  const format = await getFormatter();
  const money = (amount: number) => formatMoney(amount, shop.currency);
  const base = `/s/${shop.id}`;
  const { thisMonth, lastMonth } = monthBounds(new Date());

  const [stock, sales, recent, consignments, installments, balances, alerts] = await Promise.all([
    role === "DEALER"
      ? null
      : supabase
          .from("devices")
          .select("purchase_price, status")
          .eq("shop_id", shop.id)
          .in("status", ["IN_STOCK", "CONSIGNED"]),
    supabase
      .from("sales")
      .select("sale_price, purchase_price, shop_share, dealer_share, created_at")
      .eq("shop_id", shop.id)
      .eq("status", "COMPLETED")
      .gte("created_at", lastMonth),
    supabase
      .from("sales")
      .select("id, status, sale_price, created_at, devices(model), customers(name)")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(5),
    role === "CASHIER"
      ? null
      : supabase
          .from("consignments")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shop.id)
          .eq("status", "ACTIVE"),
    supabase
      .from("installments")
      .select("amount, sales!inner(shop_id)")
      .is("paid_on", null)
      .eq("sales.shop_id", shop.id),
    supabase.rpc("dealer_balances", { p_shop_id: shop.id }),
    loadShopAlerts(shop.id, shop.currency, role),
  ]);

  const all = sales.data ?? [];
  const current = all.filter((s) => s.created_at >= thisMonth);
  const previous = all.filter((s) => s.created_at < thisMonth);
  const revenue = sum(current.map((s) => s.sale_price));
  const owed = sum((balances.data ?? []).map((b) => b.balance));
  const customersDebt = sum((installments.data ?? []).map((i) => i.amount));
  const devices = stock?.data ?? [];
  const inStock = devices.filter((d) => d.status === "IN_STOCK").length;
  const consigned = devices.length - inStock;

  const revenueKpi: Kpi = {
    icon: "trend",
    tone: "primary",
    label: t("dashboard.revenueTitle"),
    value: money(revenue),
    note: t("dashboard.salesCount", { count: current.length }),
    change: relativeChange(revenue, sum(previous.map((s) => s.sale_price))),
    href: `${base}/sales`,
  };
  const debtKpi: Kpi = {
    icon: "wallet",
    tone: "warning",
    label: t(role === "DEALER" ? "dashboard.myDebt" : "dashboard.dealersDebt"),
    value: money(owed),
    note: t("dashboard.seeBalances"),
    href: `${base}/balances`,
  };
  const customersKpi: Kpi = {
    icon: "customers",
    tone: "accent",
    label: t("dashboard.customersDebt"),
    value: money(customersDebt),
    note: t("dashboard.customersDebtHint"),
  };
  const stockKpi: Kpi = {
    icon: "box",
    tone: "success",
    label: t("dashboard.stockTitle"),
    value: t("dashboard.stockUnits", { count: devices.length }),
    note:
      role === "OWNER"
        ? t("dashboard.stockValue", { value: money(sum(devices.map((d) => d.purchase_price))) })
        : undefined,
    href: `${base}/devices`,
  };

  const kpis: Kpi[] =
    role === "OWNER"
      ? [
          revenueKpi,
          {
            icon: "coins",
            tone: "accent",
            label: t("dashboard.profit"),
            value: money(sum(current.map((s) => (s.shop_share ?? 0) - s.purchase_price))),
            note: t("dashboard.profitHint"),
            change: relativeChange(
              sum(current.map((s) => (s.shop_share ?? 0) - s.purchase_price)),
              sum(previous.map((s) => (s.shop_share ?? 0) - s.purchase_price)),
            ),
          },
          stockKpi,
          debtKpi,
        ]
      : role === "CASHIER"
        ? [revenueKpi, stockKpi, debtKpi, customersKpi]
        : [
            revenueKpi,
            {
              icon: "coins",
              tone: "accent",
              label: t("dashboard.myEarnings"),
              value: money(sum(current.map((s) => s.dealer_share ?? 0))),
              note: t("dashboard.myRate", {
                rate: format.number(commissionRateBps / 10000, {
                  style: "percent",
                  maximumFractionDigits: 2,
                }),
              }),
              change: relativeChange(
                sum(current.map((s) => s.dealer_share ?? 0)),
                sum(previous.map((s) => s.dealer_share ?? 0)),
              ),
            },
            {
              icon: "consign",
              tone: "success",
              label: t("shop.myConsignments"),
              value: String(consignments?.count ?? 0),
              href: `${base}/consignments`,
            },
            debtKpi,
          ];

  const side =
    role === "DEALER" ? (
      <>
        <Card className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted">{t("dashboard.customersDebt")}</p>
          <p className="text-2xl font-extrabold tracking-tight">{money(customersDebt)}</p>
          <p className="text-sm text-muted">{t("dashboard.customersDebtHint")}</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <p className="font-semibold">{t("dashboard.quickActions")}</p>
          <QuickLink href={`${base}/consignments`} icon="consign" label={t("consignments.mineTitle")} />
          <QuickLink href={`${base}/sales`} icon="sales" label={t("sales.mineTitle")} />
          <QuickLink href={`${base}/balances`} icon="wallet" label={t("nav.myBalance")} />
        </Card>
      </>
    ) : (
      <>
        <Card className="flex flex-col gap-4">
          <p className="font-semibold">{t("dashboard.stockBreakdown")}</p>
          <ShareRow
            label={t("devices.status.IN_STOCK")}
            value={String(inStock)}
            ratio={devices.length ? inStock / devices.length : 0}
          />
          <ShareRow
            label={t("devices.status.CONSIGNED")}
            value={String(consigned)}
            ratio={devices.length ? consigned / devices.length : 0}
          />
        </Card>
        {role === "OWNER" ? (
          <Card className="flex flex-col gap-3">
            <p className="font-semibold">{t("dashboard.dealersTitle")}</p>
            {(balances.data ?? []).length === 0 ? (
              <p className="text-sm text-muted">{t("dashboard.noDealers")}</p>
            ) : (
              (balances.data ?? []).slice(0, 4).map((b) => (
                <ShareRow
                  key={b.membership_id}
                  label={b.dealer_name}
                  value={money(b.balance)}
                  ratio={owed ? b.balance / owed : 0}
                />
              ))
            )}
            <p className="text-sm text-muted">
              {t("dashboard.customersDebt")} : <span className="font-semibold text-fg">{money(customersDebt)}</span>
            </p>
          </Card>
        ) : null}
      </>
    );

  return (
    <DashboardView
      t={t}
      greeting={t("dashboard.greeting", { name: userName.split(/\s+/)[0] })}
      subtitle={t(
        role === "OWNER"
          ? "dashboard.ownerSubtitle"
          : role === "DEALER"
            ? "dashboard.dealerSubtitle"
            : "dashboard.cashierSubtitle",
        { shop: shop.name },
      )}
      kpis={kpis}
      currency={shop.currency}
      monthSales={all}
      recentSales={recent.data ?? []}
      salesHref={`${base}/sales`}
      alerts={alerts}
      side={side}
    />
  );
}

// ---------- Tableau de bord de l'espace perso ----------

export async function PersonalDashboard({
  supabase,
  userId,
  userName,
}: {
  supabase: Supabase;
  userId: string;
  userName: string;
}) {
  const t = await getTranslations();
  const money = (amount: number) => formatMoney(amount, PERSONAL_CURRENCY);
  const { thisMonth, lastMonth } = monthBounds(new Date());

  const [stock, sales, recent, installments, alerts] = await Promise.all([
    supabase
      .from("devices")
      .select("purchase_price")
      .eq("owner_user_id", userId)
      .eq("status", "IN_STOCK"),
    supabase
      .from("sales")
      .select("sale_price, purchase_price, created_at")
      .eq("type", "PERSONAL")
      .eq("seller_user_id", userId)
      .eq("status", "COMPLETED")
      .gte("created_at", lastMonth),
    supabase
      .from("sales")
      .select("id, status, sale_price, created_at, devices(model), customers(name)")
      .eq("type", "PERSONAL")
      .eq("seller_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("installments")
      .select("amount, sales!inner(type, seller_user_id)")
      .is("paid_on", null)
      .eq("sales.type", "PERSONAL")
      .eq("sales.seller_user_id", userId),
    loadPersonalAlerts(userId),
  ]);

  const all = sales.data ?? [];
  const current = all.filter((s) => s.created_at >= thisMonth);
  const previous = all.filter((s) => s.created_at < thisMonth);
  const revenue = sum(current.map((s) => s.sale_price));
  const profit = (list: typeof all) => sum(list.map((s) => s.sale_price - s.purchase_price));
  const devices = stock.data ?? [];

  const kpis: Kpi[] = [
    {
      icon: "trend",
      tone: "primary",
      label: t("dashboard.revenueTitle"),
      value: money(revenue),
      note: t("dashboard.salesCount", { count: current.length }),
      change: relativeChange(revenue, sum(previous.map((s) => s.sale_price))),
      href: "/perso/sales",
    },
    {
      icon: "coins",
      tone: "accent",
      label: t("dashboard.profit"),
      value: money(profit(current)),
      note: t("dashboard.personalProfitHint"),
      change: relativeChange(profit(current), profit(previous)),
    },
    {
      icon: "box",
      tone: "success",
      label: t("dashboard.stockTitle"),
      value: t("dashboard.stockUnits", { count: devices.length }),
      note: t("dashboard.stockValue", { value: money(sum(devices.map((d) => d.purchase_price))) }),
      href: "/perso/devices",
    },
    {
      icon: "customers",
      tone: "warning",
      label: t("dashboard.customersDebt"),
      value: money(sum((installments.data ?? []).map((i) => i.amount))),
      note: t("dashboard.customersDebtHint"),
    },
  ];

  return (
    <DashboardView
      t={t}
      greeting={t("dashboard.greeting", { name: userName.split(/\s+/)[0] })}
      subtitle={t("dashboard.personalSubtitle")}
      kpis={kpis}
      currency={PERSONAL_CURRENCY}
      monthSales={all}
      recentSales={recent.data ?? []}
      salesHref="/perso/sales"
      alerts={alerts}
      side={
        <Card className="flex flex-col gap-2">
          <p className="font-semibold">{t("dashboard.quickActions")}</p>
          <QuickLink href="/perso/devices/new" icon="plus" label={t("devices.add")} />
          <QuickLink href="/perso/devices" icon="phone" label={t("devices.personalTitle")} />
          <QuickLink href="/perso/customers" icon="customers" label={t("customers.personalTitle")} />
        </Card>
      }
    />
  );
}
