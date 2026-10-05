import { getTranslations } from "next-intl/server";
import { AppShell, type NavItem } from "@/components/app-shell";
import { loadShopAlerts } from "@/features/dashboard/alerts";
import { requireShop } from "@/lib/session";

export default async function ShopLayout({
  children,
  params,
}: LayoutProps<"/s/[shopId]">) {
  const { shopId } = await params;
  const { shop, membership } = await requireShop(shopId);
  const t = await getTranslations();
  const base = `/s/${shop.id}`;
  const { role } = membership;

  // Chaque profil a son menu : le dealer ne voit ni le stock ni la gestion de
  // la boutique ; le caissier ne voit pas les dépôts.
  const nav: NavItem[] = [{ href: base, label: t("nav.home"), icon: "home", exact: true }];
  if (role !== "DEALER") {
    nav.push({ href: `${base}/devices`, label: t("nav.stock"), icon: "phone" });
  }
  if (role !== "CASHIER") {
    nav.push({
      href: `${base}/consignments`,
      label: t("nav.consignments"),
      icon: "consign",
    });
  }
  nav.push(
    {
      href: `${base}/sales`,
      label: t("nav.sales"),
      icon: "sales",
    },
    {
      href: `${base}/balances`,
      label: t(role === "DEALER" ? "nav.myBalance" : "nav.balances"),
      icon: "wallet",
    },
    { href: `${base}/customers`, label: t("nav.customers"), icon: "customers" },
  );
  if (role === "OWNER") {
    nav.push(
      { href: `${base}/members`, label: t("nav.members"), icon: "members" },
      { href: `${base}/settings`, label: t("nav.settings"), icon: "settings" },
    );
  }

  const primaryAction =
    role === "OWNER"
      ? { href: `${base}/devices/new`, label: t("devices.add") }
      : role === "CASHIER"
        ? { href: `${base}/devices`, label: t("sales.sell") }
        : { href: `${base}/consignments`, label: t("sales.sell") };

  return (
    <AppShell
      brand={shop.name}
      space={shop.id}
      role={t(`roles.${role}`)}
      nav={nav}
      alerts={await loadShopAlerts(shop.id, shop.currency, role)}
      primaryAction={primaryAction}
      search={
        role === "DEALER"
          ? undefined
          : { href: `${base}/devices`, placeholder: t("devices.searchShort") }
      }
    >
      {children}
    </AppShell>
  );
}
