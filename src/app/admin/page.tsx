import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { icons, type IconName } from "@/components/icons";
import { Badge, Card, PageHeader, SectionTitle, focusRing } from "@/components/ui";
import { formatMoney, PERSONAL_CURRENCY } from "@/domain/money";
import { periodBounds } from "@/domain/stats";
import { requireSuperadmin } from "@/lib/superadmin";

// Vue d'ensemble de la plateforme : les chiffres clés et les derniers arrivés.
export default async function AdminOverviewPage() {
  const { admin } = await requireSuperadmin();
  const t = await getTranslations("admin");
  const format = await getFormatter();
  // Les 30 derniers jours, aujourd'hui compris.
  const since = periodBounds("month", new Date()).start;
  const count = { count: "exact", head: true } as const;

  const [users, newUsers, shops, suspendedShops, devices, sales, recentSales, latestUsers, latestShops] =
    await Promise.all([
      admin.from("users").select("id", count),
      admin.from("users").select("id", count).gte("created_at", since),
      admin.from("shops").select("id", count),
      admin.from("shops").select("id", count).not("suspended_at", "is", null),
      admin.from("devices").select("id", count).in("status", ["IN_STOCK", "CONSIGNED"]),
      admin.from("sales").select("id", count).eq("status", "COMPLETED"),
      // Ventes boutique des 30 derniers jours, par devise. Les ventes perso
      // restent privées : on ne les compte qu'en nombre, ailleurs.
      admin
        .from("sales")
        .select("sale_price, shops(currency)")
        .eq("status", "COMPLETED")
        .eq("type", "SHOP")
        .gte("created_at", since),
      admin.from("users").select("id, name, phone, email, created_at").order("created_at", { ascending: false }).limit(5),
      admin.from("shops").select("id, name, created_at, suspended_at").order("created_at", { ascending: false }).limit(5),
    ]);

  const volume = new Map<string, number>();
  for (const sale of recentSales.data ?? []) {
    const currency = sale.shops?.currency ?? PERSONAL_CURRENCY;
    volume.set(currency, (volume.get(currency) ?? 0) + sale.sale_price);
  }
  const volumeLabel =
    [...volume].map(([currency, total]) => formatMoney(total, currency)).join(" · ") ||
    formatMoney(0, PERSONAL_CURRENCY);

  const tiles: { icon: IconName; label: string; value: string; note?: string; href?: string }[] = [
    {
      icon: "customers",
      label: t("stats.users"),
      value: String(users.count ?? 0),
      note: t("stats.newUsers", { count: newUsers.count ?? 0 }),
      href: "/admin/users",
    },
    {
      icon: "spaces",
      label: t("stats.shops"),
      value: String(shops.count ?? 0),
      note: t("stats.suspended", { count: suspendedShops.count ?? 0 }),
      href: "/admin/shops",
    },
    { icon: "phone", label: t("stats.devices"), value: String(devices.count ?? 0) },
    { icon: "sales", label: t("stats.sales"), value: String(sales.count ?? 0) },
    { icon: "coins", label: t("stats.volume"), value: volumeLabel, note: t("stats.volumeHint") },
  ];
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium" });
  const row = `flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2 ${focusRing}`;

  return (
    <>
      <PageHeader title={t("overviewTitle")} subtitle={t("overviewSubtitle")} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((tile, index) => {
          const body = (
            <div
              className={`flex h-full flex-col gap-1.5 rounded-3xl p-4 shadow-card ${index === 0 ? "bg-primary text-on-primary" : "bg-surface"}`}
            >
              <span
                aria-hidden
                className={`inline-flex size-10 items-center justify-center rounded-full ${index === 0 ? "bg-on-primary/15" : "bg-tint-1 text-primary"}`}
              >
                {icons[tile.icon]}
              </span>
              <p className="mt-1 text-sm font-semibold opacity-80">{tile.label}</p>
              <p className="text-xl font-extrabold tracking-tight">{tile.value}</p>
              {tile.note ? <p className="text-xs opacity-75">{tile.note}</p> : null}
            </div>
          );
          return (
            <div key={tile.label} className={index === 4 ? "col-span-2 lg:col-span-1" : ""}>
              {tile.href ? (
                <Link href={tile.href} className={`block h-full rounded-3xl ${focusRing}`}>
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle>{t("latestUsers")}</SectionTitle>
          <Card className="divide-y divide-border overflow-hidden p-0 sm:p-0">
            {(latestUsers.data ?? []).map((user) => (
              <Link key={user.id} href={`/admin/users/${user.id}`} className={row}>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{user.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {user.phone ? `+${user.phone}` : user.email}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted">{date(user.created_at)}</span>
              </Link>
            ))}
          </Card>
        </section>
        <section>
          <SectionTitle>{t("latestShops")}</SectionTitle>
          <Card className="divide-y divide-border overflow-hidden p-0 sm:p-0">
            {(latestShops.data ?? []).length === 0 ? (
              <p className="p-4 text-muted">{t("noShops")}</p>
            ) : (
              (latestShops.data ?? []).map((shop) => (
                <Link key={shop.id} href={`/admin/shops/${shop.id}`} className={row}>
                  <span className="min-w-0 truncate font-semibold">{shop.name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {shop.suspended_at ? <Badge tone="danger">{t("suspended")}</Badge> : null}
                    <span className="text-xs text-muted">{date(shop.created_at)}</span>
                  </span>
                </Link>
              ))
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
