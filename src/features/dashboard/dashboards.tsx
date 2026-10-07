import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { icons, type IconName } from "@/components/icons";
import type { ShellAlert } from "@/components/shell";
import { Badge, Card, SectionTitle, focusRing } from "@/components/ui";
import { currencyFractionDigits, formatMoney, PERSONAL_CURRENCY } from "@/domain/money";
import { dailyTotals, monthBounds, relativeChange, type DayTotal } from "@/domain/stats";
import type { MemberRole } from "@/lib/session";
import type { createClient } from "@/lib/supabase/server";
import { loadPersonalAlerts, loadShopAlerts } from "./alerts";
import { BarChart } from "./bar-chart";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Translate = Awaited<ReturnType<typeof getTranslations>>;

const CHART_DAYS = 14;

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

type Tone = "primary" | "accent" | "success" | "warning";

type Kpi = {
  icon: IconName;
  tone: Tone;
  label: string;
  value: string;
  note?: string;
  // Évolution (0.25 = +25 %) affichée en pastille ; absente = pas de pastille.
  change?: number | null;
  href?: string;
};

type Action = { href: string; icon: IconName; label: string };

// Tuiles colorées : un fond teinté par indicateur, pour les distinguer d'un coup d'œil.
const tileTones: Record<Tone, string> = {
  primary: "bg-primary-soft text-on-primary-soft",
  accent: "bg-primary text-on-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
};

async function KpiTile({ kpi }: { kpi: Kpi }) {
  const format = await getFormatter();
  const body = (
    <div
      className={`relative flex h-full min-h-36 flex-col gap-2 overflow-hidden rounded-3xl p-4 transition hover:-translate-y-0.5 ${tileTones[kpi.tone]}`}
    >
      {/* Grande icône en filigrane. */}
      <span aria-hidden className="pointer-events-none absolute -bottom-3 -right-3 opacity-15 [&>svg]:size-24">
        {icons[kpi.icon]}
      </span>
      <div className="flex items-center justify-between gap-2">
        <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-2xl bg-surface/70 text-fg">
          {icons[kpi.icon]}
        </span>
        {kpi.change !== undefined && kpi.change !== null ? (
          <span className="rounded-full bg-surface/80 px-2 py-1 text-xs font-bold text-fg">
            {format.number(kpi.change, {
              style: "percent",
              maximumFractionDigits: 0,
              signDisplay: "always",
            })}
          </span>
        ) : null}
      </div>
      <p className="text-sm font-semibold opacity-90">{kpi.label}</p>
      <p className={`text-2xl font-extrabold tracking-tight ${kpi.tone === "accent" ? "" : "text-fg"}`}>{kpi.value}</p>
      {kpi.note ? <p className="mt-auto text-xs font-medium opacity-80">{kpi.note}</p> : null}
    </div>
  );
  return kpi.href ? (
    <Link href={kpi.href} className={`block h-full rounded-3xl ${focusRing}`}>
      {body}
    </Link>
  ) : (
    body
  );
}

// Courbe décorative des 14 derniers jours dans la carte d'accueil.
function Sparkline({ series }: { series: DayTotal[] }) {
  const max = Math.max(1, ...series.map((entry) => entry.total));
  const step = 100 / (series.length - 1);
  const points = series.map((entry, index) => [index * step, 36 - (entry.total / max) * 30] as const);
  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden className="h-16 w-full">
      <path d={`${line} L100,40 L0,40 Z`} className="fill-on-brand/15" />
      <path
        d={line}
        fill="none"
        className="stroke-on-brand"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
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

// Mise en page commune à tous les tableaux de bord, pensée d'abord pour le
// téléphone : carte d'accueil, raccourcis, indicateurs à faire glisser,
// graphique, dernières ventes, alertes.
async function DashboardView({
  t,
  greeting,
  subtitle,
  revenue,
  revenueChange,
  salesCount,
  actions,
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
  revenue: number;
  revenueChange: number | null;
  salesCount: number;
  actions: Action[];
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
      {/* Carte d'accueil : le chiffre du mois, sur le dégradé de la marque. */}
      <section className="relative animate-rise overflow-hidden rounded-[2rem] bg-linear-to-br from-brand to-brand-2 p-5 text-on-brand shadow-card lg:p-8">
        <div className="relative grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight lg:text-3xl">{greeting}</h1>
            <p className="mt-1 text-sm text-on-brand-muted">{subtitle}</p>
            <p className="mt-5 text-sm font-semibold text-on-brand-muted">{t("dashboard.heroLabel")}</p>
            <div className="mt-1 flex flex-wrap items-end gap-3">
              <p className="text-4xl font-extrabold tracking-tight lg:text-5xl">{money(revenue)}</p>
              {revenueChange !== null ? (
                <span className="mb-1.5 rounded-full bg-on-brand px-2.5 py-1 text-xs font-bold text-brand">
                  {format.number(revenueChange, {
                    style: "percent",
                    maximumFractionDigits: 0,
                    signDisplay: "always",
                  })}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-on-brand-muted">
              {t("dashboard.heroSales", { count: salesCount })}
            </p>
          </div>
          <div>
            <p className="mb-1 text-right text-xs font-semibold text-on-brand-muted">
              {t("dashboard.trend")}
            </p>
            <Sparkline series={series} />
          </div>
        </div>
      </section>

      {/* Raccourcis : gros boutons, à portée de pouce. */}
      <nav aria-label={t("dashboard.quickActions")} className="no-scrollbar -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex min-w-24 flex-1 flex-col items-center gap-2 rounded-3xl border border-border bg-surface p-3 text-center text-xs font-semibold shadow-card transition hover:-translate-y-0.5 hover:border-primary ${focusRing}`}
          >
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-on-primary">
              {icons[action.icon]}
            </span>
            {action.label}
          </Link>
        ))}
      </nav>

      {/* Indicateurs : bandeau à faire glisser sur téléphone, grille sur ordinateur. */}
      <div className="no-scrollbar -mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="w-44 shrink-0 snap-start lg:w-auto">
            <KpiTile kpi={kpi} />
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-3xl lg:col-span-2">
          <p className="font-bold">{t("dashboard.chartTitle")}</p>
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
            <p className="rounded-2xl bg-surface-2 p-6 text-center text-sm text-muted">
              {t("dashboard.chartEmpty")}
            </p>
          )}
        </Card>
        <div className="flex flex-col gap-4">{side}</div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <SectionTitle>{t("dashboard.recentSales")}</SectionTitle>
            <Link href={salesHref} className={`text-sm font-semibold text-primary ${focusRing}`}>
              {t("dashboard.seeAll")}
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <Card className="rounded-3xl text-muted">{t("dashboard.noSales")}</Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentSales.map((sale) => (
                <li
                  key={sale.id}
                  className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-3 shadow-card"
                >
                  <span
                    aria-hidden
                    className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-on-primary-soft"
                  >
                    {icons.phone}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{sale.devices?.model}</span>
                    <span className="block truncate text-sm text-muted">
                      {sale.customers?.name} ·{" "}
                      {format.dateTime(new Date(sale.created_at), { dateStyle: "medium" })}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-bold">{money(sale.sale_price)}</span>
                    <Badge tone={saleTones[sale.status]}>{t(`sales.status.${sale.status}`)}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle>{t("dashboard.alerts")}</SectionTitle>
          {alerts.length === 0 ? (
            <Card className="flex items-center gap-3 rounded-3xl text-muted">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
                {icons.check}
              </span>
              {t("dashboard.noAlerts")}
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {alerts.map((alert) => (
                <li key={alert.key}>
                  <Link
                    href={alert.href}
                    className={`flex min-h-16 items-center gap-3 rounded-3xl border border-border bg-surface p-3 shadow-card transition hover:border-danger ${focusRing}`}
                  >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-danger-soft text-danger">
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

// Anneau de progression : part du stock confiée aux dealers.
function StockRing({
  t,
  inShop,
  consigned,
  percentLabel,
}: {
  t: Translate;
  inShop: number;
  consigned: number;
  percentLabel: string;
}) {
  const total = inShop + consigned;
  const ratio = total ? consigned / total : 0;
  const radius = 42;
  const length = 2 * Math.PI * radius;
  return (
    <Card className="flex items-center gap-4 rounded-3xl">
      <div className="relative size-28 shrink-0">
        <svg viewBox="0 0 100 100" aria-hidden className="size-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" className="stroke-surface-2" strokeWidth="10" />
          {ratio > 0 ? (
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            className="stroke-chart"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${length * ratio} ${length}`}
          />
          ) : null}
        </svg>
        <p className="absolute inset-0 flex items-center justify-center text-xl font-extrabold">
          {percentLabel}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{t("dashboard.stockBreakdown")}</p>
        <p className="mb-2 text-xs text-muted">
          {total
            ? t("dashboard.stockRing", { percent: percentLabel })
            : t("dashboard.stockRingEmpty")}
        </p>
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2 text-muted">
              <span aria-hidden className="size-2.5 rounded-full bg-surface-2 ring-1 ring-border" />
              {t("dashboard.inShop")}
            </dt>
            <dd className="font-bold">{inShop}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2 text-muted">
              <span aria-hidden className="size-2.5 rounded-full bg-chart" />
              {t("dashboard.withDealers")}
            </dt>
            <dd className="font-bold">{consigned}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}

// Ligne « libellé — valeur » avec une barre de proportion (une seule teinte).
function ShareRow({ label, value, ratio }: { label: string; value: string; ratio: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate text-muted">{label}</span>
        <span className="font-bold">{value}</span>
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
  const shopProfit = (list: typeof all) => sum(list.map((s) => (s.shop_share ?? 0) - s.purchase_price));
  const earnings = (list: typeof all) => sum(list.map((s) => s.dealer_share ?? 0));

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
    tone: "primary",
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
          {
            icon: "coins",
            tone: "accent",
            label: t("dashboard.profit"),
            value: money(shopProfit(current)),
            note: t("dashboard.profitHint"),
            change: relativeChange(shopProfit(current), shopProfit(previous)),
          },
          stockKpi,
          debtKpi,
        ]
      : role === "CASHIER"
        ? [stockKpi, debtKpi, customersKpi]
        : [
            {
              icon: "coins",
              tone: "accent",
              label: t("dashboard.myEarnings"),
              value: money(earnings(current)),
              note: t("dashboard.myRate", {
                rate: format.number(commissionRateBps / 10000, {
                  style: "percent",
                  maximumFractionDigits: 2,
                }),
              }),
              change: relativeChange(earnings(current), earnings(previous)),
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

  // Raccourcis : ce que chaque profil fait le plus souvent.
  const actions: Action[] =
    role === "OWNER"
      ? [
          { href: `${base}/devices/new`, icon: "plus", label: t("devices.add") },
          { href: `${base}/devices`, icon: "phone", label: t("nav.stock") },
          { href: `${base}/consignments`, icon: "consign", label: t("nav.consignments") },
          { href: `${base}/balances`, icon: "wallet", label: t("nav.balances") },
        ]
      : role === "CASHIER"
        ? [
            { href: `${base}/devices`, icon: "phone", label: t("sales.sell") },
            { href: `${base}/sales`, icon: "sales", label: t("nav.sales") },
            { href: `${base}/balances`, icon: "wallet", label: t("nav.balances") },
            { href: `${base}/customers`, icon: "customers", label: t("nav.customers") },
          ]
        : [
            { href: `${base}/consignments`, icon: "consign", label: t("consignments.mineTitle") },
            { href: `${base}/sales`, icon: "sales", label: t("sales.mineTitle") },
            { href: `${base}/balances`, icon: "wallet", label: t("nav.myBalance") },
            { href: "/perso", icon: "account", label: t("spaces.personal") },
          ];

  const side =
    role === "DEALER" ? (
      <Card className="flex flex-col gap-1 rounded-3xl">
        <p className="text-sm font-semibold text-muted">{t("dashboard.customersDebt")}</p>
        <p className="text-2xl font-extrabold tracking-tight">{money(customersDebt)}</p>
        <p className="text-sm text-muted">{t("dashboard.customersDebtHint")}</p>
      </Card>
    ) : (
      <>
        <StockRing
          t={t}
          inShop={inStock}
          consigned={consigned}
          percentLabel={format.number(devices.length ? consigned / devices.length : 0, {
            style: "percent",
            maximumFractionDigits: 0,
          })}
        />
        {role === "OWNER" ? (
          <Card className="flex flex-col gap-3 rounded-3xl">
            <p className="font-bold">{t("dashboard.dealersTitle")}</p>
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
              {t("dashboard.customersDebt")} :{" "}
              <span className="font-bold text-fg">{money(customersDebt)}</span>
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
      revenue={revenue}
      revenueChange={relativeChange(revenue, sum(previous.map((s) => s.sale_price)))}
      salesCount={current.length}
      actions={actions}
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
      revenue={revenue}
      revenueChange={relativeChange(revenue, sum(previous.map((s) => s.sale_price)))}
      salesCount={current.length}
      actions={[
        { href: "/perso/devices/new", icon: "plus", label: t("devices.add") },
        { href: "/perso/devices", icon: "phone", label: t("nav.devices") },
        { href: "/perso/sales", icon: "sales", label: t("nav.sales") },
        { href: "/perso/customers", icon: "customers", label: t("nav.customers") },
      ]}
      kpis={kpis}
      currency={PERSONAL_CURRENCY}
      monthSales={all}
      recentSales={recent.data ?? []}
      salesHref="/perso/sales"
      alerts={alerts}
      side={null}
    />
  );
}
