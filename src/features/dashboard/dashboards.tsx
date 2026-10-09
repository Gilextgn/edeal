import Image from "next/image";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { icons, type IconName } from "@/components/icons";
import type { ShellAlert } from "@/components/shell";
import { Badge, Card, SectionTitle, focusRing } from "@/components/ui";
import { currencyFractionDigits, formatMoney, PERSONAL_CURRENCY } from "@/domain/money";
import {
  PERIODS,
  periodBounds,
  periodTotals,
  relativeChange,
  type Period,
} from "@/domain/stats";
import type { MemberRole } from "@/lib/session";
import type { createClient } from "@/lib/supabase/server";
import { loadPersonalAlerts, loadShopAlerts } from "./alerts";
import { DeviceCard, loadDeviceCovers } from "@/features/devices/device-cards";
import { StatusBadge, Variant } from "@/features/devices/labels";
import { BarChart } from "./bar-chart";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Translate = Awaited<ReturnType<typeof getTranslations>>;

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

// Tuiles d'indicateur : une rouge, deux douces, une blanche, pour les
// distinguer d'un coup d'œil.
const tileTones: Record<Tone, string> = {
  primary: "bg-surface text-fg shadow-card",
  accent: "bg-primary text-on-primary",
  success: "bg-tint-2 text-fg",
  warning: "bg-tint-3 text-fg",
};

async function KpiTile({ kpi }: { kpi: Kpi }) {
  const format = await getFormatter();
  const body = (
    <div
      className={`flex h-full min-h-32 flex-col gap-1.5 rounded-3xl p-4 transition hover:-translate-y-0.5 ${tileTones[kpi.tone]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          aria-hidden
          className={`inline-flex size-10 items-center justify-center rounded-full ${kpi.tone === "accent" ? "bg-on-primary/15" : "bg-surface/70"}`}
        >
          {icons[kpi.icon]}
        </span>
        {kpi.change !== undefined && kpi.change !== null ? (
          <span className="rounded-full bg-surface px-2 py-1 text-xs font-bold text-fg">
            {format.number(kpi.change, {
              style: "percent",
              maximumFractionDigits: 0,
              signDisplay: "always",
            })}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm font-semibold opacity-80">{kpi.label}</p>
      <p className="text-xl font-extrabold tracking-tight sm:text-2xl">{kpi.value}</p>
      {kpi.note ? <p className="mt-auto text-xs font-medium opacity-75">{kpi.note}</p> : null}
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

type DeviceRow = {
  id: string;
  model: string;
  capacity: string;
  color: string;
  target_price: number;
  status: string;
};

// Mise en page commune à tous les tableaux de bord, pensée d'abord pour le
// téléphone, comme l'accueil d'une application de commande : recherche,
// grande bannière (total vendu et action principale), raccourcis ronds à
// faire glisser, appareils en cartes, puis indicateurs, graphique, dernières
// ventes et alertes.
async function DashboardView({
  t,
  name,
  subtitle,
  period,
  homeHref,
  revenue,
  revenueChange,
  salesCount,
  primary,
  searchHref,
  actions,
  devices,
  covers,
  deviceHref,
  devicesHref,
  kpis,
  currency,
  sales,
  recentSales,
  salesHref,
  alerts,
  side,
}: {
  t: Translate;
  name: string;
  subtitle: string;
  period: Period;
  // Adresse du tableau de bord, pour les boutons de période.
  homeHref: string;
  revenue: number;
  revenueChange: number | null;
  salesCount: number;
  // Bouton de la bannière : ce que ce profil fait le plus souvent.
  primary: Action;
  // Liste qui reçoit la recherche (« ?q= »), s'il y en a une pour ce profil.
  searchHref: string | null;
  actions: Action[];
  devices: DeviceRow[];
  covers: Map<string, string>;
  deviceHref: (id: string) => string;
  devicesHref: string;
  kpis: Kpi[];
  currency: string;
  sales: { created_at: string; sale_price: number }[];
  recentSales: RecentSale[];
  salesHref: string;
  alerts: ShellAlert[];
  side: ReactNode;
}) {
  const format = await getFormatter();
  const money = (amount: number) => formatMoney(amount, currency);
  const series = periodTotals(sales, period, new Date());
  const hasSales = series.some((entry) => entry.total > 0);
  const byMonth = period === "year";
  const chartTitle = t(`dashboard.chartTitle.${period}`);

  return (
    <>
      {/* Ordinateur : le bonjour. Sur téléphone, la barre du haut le dit déjà. */}
      <header className="mb-5 hidden animate-rise items-center gap-3 lg:flex">
        <span
          aria-hidden
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-on-primary"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">
            {t("dashboard.greeting", { name })}
          </h1>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
      </header>

      {/* Téléphone : la recherche, sous la barre du haut. */}
      <div className="-mx-4 -mt-3 mb-5 rounded-b-[2rem] bg-primary px-4 pt-1 pb-5 lg:hidden">
      {searchHref ? (
        <form action={searchHref} role="search" className="flex gap-2.5">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg">
              {icons.search}
            </span>
            <input
              type="search"
              name="q"
              placeholder={t("dashboard.searchPlaceholder")}
              aria-label={t("devices.search")}
              className="h-13 w-full rounded-2xl bg-surface pl-12 pr-4 text-sm text-fg placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
            />
          </div>
          <Link
            href={searchHref}
            aria-label={t("dashboard.seeAll")}
            className="inline-flex size-13 shrink-0 items-center justify-center rounded-2xl bg-surface text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
          >
            {icons.settings}
          </Link>
        </form>
      ) : null}
      </div>

      {/* Bannière : le total vendu sur la période et l'action principale. */}
      <section className="relative animate-rise overflow-hidden rounded-[2rem] bg-surface shadow-card">
        {/* Photo sur la moitié droite, fondue dans le rouge vers la gauche. */}
        <div className="absolute inset-y-0 right-0 w-3/5 lg:w-1/2">
          <Image
            src="/login/iphone-13-fan.jpg"
            alt=""
            fill
            unoptimized
            priority
            sizes="(min-width: 1024px) 40vw, 75vw"
            className="object-cover object-[60%_45%] [mask-image:linear-gradient(to_right,transparent_10%,black_85%)]"
          />
        </div>
        <div className="relative flex min-h-60 flex-col justify-between gap-5 p-5 lg:min-h-0 lg:gap-4 lg:p-6">
          {/* Période : tous les chiffres « vendus » la suivent. */}
          <nav
            aria-label={t("dashboard.periodLabel")}
            className="flex w-fit gap-0.5 rounded-full bg-surface-2 p-1"
          >
            {PERIODS.map((option) => (
              <Link
                key={option}
                href={`${homeHref}?period=${option}`}
                aria-current={option === period ? "true" : undefined}
                className={`flex min-h-11 items-center rounded-full px-4 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${option === period ? "bg-primary text-on-primary" : "text-muted hover:text-fg"}`}
              >
                {t(`dashboard.periods.${option}`)}
              </Link>
            ))}
          </nav>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
              {t(`dashboard.heroLabel.${period}`)}
            </p>
            <p className="mt-1 text-4xl leading-none font-extrabold tracking-tight">
              {money(revenue)}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
              {t("dashboard.salesCount", { count: salesCount })}
              {revenueChange !== null ? (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-on-primary-soft">
                  {format.number(revenueChange, {
                    style: "percent",
                    maximumFractionDigits: 0,
                    signDisplay: "always",
                  })}
                </span>
              ) : null}
            </p>
          </div>

          <Link
            href={primary.href}
            className="inline-flex min-h-12 w-fit items-center gap-3 rounded-full bg-primary py-1.5 pl-5 pr-2 text-sm font-bold text-on-primary shadow-card transition hover:bg-primary-hover active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {primary.label}
            <span
              aria-hidden
              className="inline-flex size-8 items-center justify-center rounded-full bg-on-primary text-primary"
            >
              {icons.chevron}
            </span>
          </Link>
        </div>
      </section>

      {/* Raccourcis ronds, à faire glisser. */}
      <nav
        aria-label={t("dashboard.quickActions")}
        className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:gap-5 lg:px-0"
      >
        {actions.map((action, index) => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex w-[4.75rem] shrink-0 flex-col items-center gap-2 rounded-2xl text-center text-xs font-semibold ${focusRing}`}
          >
            <span
              className={`inline-flex size-14 items-center justify-center rounded-full bg-surface shadow-card transition-colors ${index === 0 ? "text-primary ring-2 ring-primary" : "text-fg hover:text-primary"}`}
            >
              {icons[action.icon]}
            </span>
            <span className={`leading-tight ${index === 0 ? "text-primary" : ""}`}>
              {action.label}
            </span>
          </Link>
        ))}
      </nav>

      {/* Appareils : cartes à faire glisser sur téléphone, grille sur ordinateur. */}
      <section className="mt-6">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-extrabold tracking-tight">{t("dashboard.stock")}</h2>
          <Link
            href={devicesHref}
            className={`flex min-h-11 items-center gap-1 text-sm font-semibold text-primary ${focusRing}`}
          >
            {t("dashboard.seeAll")}
            {icons.chevron}
          </Link>
        </div>
        {devices.length === 0 ? (
          <Card className="text-muted">{t("dashboard.stockRingEmpty")}</Card>
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 xl:grid-cols-6">
            {devices.map((device) => (
              <div key={device.id} className="w-40 shrink-0 snap-start lg:w-auto">
                <DeviceCard
                  href={deviceHref(device.id)}
                  model={device.model}
                  variant={<Variant capacity={device.capacity} color={device.color} />}
                  price={money(device.target_price)}
                  cover={covers.get(device.id)}
                  badge={device.status === "CONSIGNED" ? <StatusBadge status="CONSIGNED" /> : null}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Indicateurs : deux par ligne sur téléphone, le premier sur toute la largeur. */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.label}
            className={index === 0 && kpis.length % 2 === 1 ? "col-span-2 lg:col-span-1" : ""}
          >
            <KpiTile kpi={kpi} />
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="font-bold">{chartTitle}</p>
          <p className="mb-3 text-sm text-muted">
            {t(byMonth ? "dashboard.chartSubtitleMonth" : "dashboard.chartSubtitle")}
          </p>
          {hasSales ? (
            <BarChart
              caption={chartTitle}
              divisor={10 ** currencyFractionDigits(currency)}
              points={series.map((entry) => {
                const date = new Date(entry.key);
                return {
                  label: format.dateTime(
                    date,
                    byMonth
                      ? { month: "short", timeZone: "UTC" }
                      : { day: "numeric", month: "short", timeZone: "UTC" },
                  ),
                  detail: t("dashboard.chartDay", {
                    date: format.dateTime(
                      date,
                      byMonth
                        ? { month: "long", year: "numeric", timeZone: "UTC" }
                        : { dateStyle: "long", timeZone: "UTC" },
                    ),
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
                  className="flex items-center gap-3 rounded-3xl bg-surface p-3 shadow-card"
                >
                  <span
                    aria-hidden
                    className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-tint-1"
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
                    className={`flex min-h-16 items-center gap-3 rounded-3xl bg-surface p-3 shadow-card transition hover:-translate-y-0.5 ${focusRing}`}
                  >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
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
  period,
}: {
  supabase: Supabase;
  shop: { id: string; name: string; currency: string };
  role: MemberRole;
  userName: string;
  commissionRateBps: number;
  period: Period;
}) {
  const t = await getTranslations();
  const format = await getFormatter();
  const money = (amount: number) => formatMoney(amount, shop.currency);
  const base = `/s/${shop.id}`;
  const { start, previousStart } = periodBounds(period, new Date());

  const [devices6, stock, sales, recent, consignments, installments, balances, alerts] = await Promise.all([
    // Derniers appareils disponibles ; pour un dealer, la base ne renvoie que
    // ceux qui lui sont confiés.
    supabase
      .from("devices")
      .select("id, model, capacity, color, target_price, status")
      .eq("shop_id", shop.id)
      .in("status", ["IN_STOCK", "CONSIGNED"])
      .order("created_at", { ascending: false })
      .limit(6),
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
      .gte("created_at", previousStart),
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
  const current = all.filter((s) => s.created_at >= start);
  const previous = all.filter((s) => s.created_at < start);
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
    label: t("dashboard.stock"),
    value: String(devices.length),
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
          { href: `${base}/devices`, icon: "phone", label: t("nav.stock") },
          { href: `${base}/consignments`, icon: "consign", label: t("nav.consignments") },
          { href: `${base}/sales`, icon: "sales", label: t("nav.sales") },
          { href: `${base}/balances`, icon: "wallet", label: t("nav.balances") },
          { href: `${base}/customers`, icon: "customers", label: t("nav.customers") },
          { href: `${base}/members`, icon: "members", label: t("nav.members") },
        ]
      : role === "CASHIER"
        ? [
            { href: `${base}/devices`, icon: "phone", label: t("nav.stock") },
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

  // Bouton de la bannière.
  const primary: Action =
    role === "OWNER"
      ? { href: `${base}/devices/new`, icon: "plus", label: t("devices.add") }
      : role === "CASHIER"
        ? { href: `${base}/devices`, icon: "phone", label: t("sales.sell") }
        : { href: `${base}/consignments`, icon: "consign", label: t("consignments.mineTitle") };
  // Un dealer n'a pas d'écran de stock : ses appareils sont ses dépôts.
  const devicesHref = role === "DEALER" ? `${base}/consignments` : `${base}/devices`;
  const showcase = devices6.data ?? [];
  const covers = await loadDeviceCovers(
    supabase,
    showcase.map((device) => device.id),
  );

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
      name={userName.split(/\s+/)[0]}
      subtitle={t(
        role === "OWNER"
          ? "dashboard.ownerSubtitle"
          : role === "DEALER"
            ? "dashboard.dealerSubtitle"
            : "dashboard.cashierSubtitle",
        { shop: shop.name },
      )}
      period={period}
      homeHref={base}
      revenue={revenue}
      revenueChange={relativeChange(revenue, sum(previous.map((s) => s.sale_price)))}
      salesCount={current.length}
      primary={primary}
      searchHref={role === "DEALER" ? null : `${base}/devices`}
      actions={actions}
      devices={showcase}
      covers={covers}
      deviceHref={(id) => (role === "DEALER" ? devicesHref : `${base}/devices/${id}`)}
      devicesHref={devicesHref}
      kpis={kpis}
      currency={shop.currency}
      sales={all}
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
  period,
}: {
  supabase: Supabase;
  userId: string;
  userName: string;
  period: Period;
}) {
  const t = await getTranslations();
  const money = (amount: number) => formatMoney(amount, PERSONAL_CURRENCY);
  const { start, previousStart } = periodBounds(period, new Date());

  const [stock, sales, recent, installments, alerts] = await Promise.all([
    supabase
      .from("devices")
      .select("id, model, capacity, color, target_price, status, purchase_price")
      .eq("owner_user_id", userId)
      .eq("status", "IN_STOCK")
      .order("created_at", { ascending: false }),
    supabase
      .from("sales")
      .select("sale_price, purchase_price, created_at")
      .eq("type", "PERSONAL")
      .eq("seller_user_id", userId)
      .eq("status", "COMPLETED")
      .gte("created_at", previousStart),
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
  const current = all.filter((s) => s.created_at >= start);
  const previous = all.filter((s) => s.created_at < start);
  const revenue = sum(current.map((s) => s.sale_price));
  const profit = (list: typeof all) => sum(list.map((s) => s.sale_price - s.purchase_price));
  const devices = stock.data ?? [];
  const showcase = devices.slice(0, 6);
  const covers = await loadDeviceCovers(
    supabase,
    showcase.map((device) => device.id),
  );

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
      label: t("dashboard.stock"),
      value: String(devices.length),
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
      name={userName.split(/\s+/)[0]}
      subtitle={t("dashboard.personalSubtitle")}
      period={period}
      homeHref="/perso"
      revenue={revenue}
      revenueChange={relativeChange(revenue, sum(previous.map((s) => s.sale_price)))}
      salesCount={current.length}
      primary={{ href: "/perso/devices/new", icon: "plus", label: t("devices.add") }}
      searchHref="/perso/devices"
      devices={showcase}
      covers={covers}
      deviceHref={(id) => `/perso/devices/${id}`}
      devicesHref="/perso/devices"
      actions={[
        { href: "/perso/devices", icon: "phone", label: t("nav.devices") },
        { href: "/perso/sales", icon: "sales", label: t("nav.sales") },
        { href: "/perso/customers", icon: "customers", label: t("nav.customers") },
      ]}
      kpis={kpis}
      currency={PERSONAL_CURRENCY}
      sales={all}
      recentSales={recent.data ?? []}
      salesHref="/perso/sales"
      alerts={alerts}
      side={null}
    />
  );
}
