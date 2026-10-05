import { getTranslations } from "next-intl/server";
import { AppShell, type NavItem } from "@/components/app-shell";
import { requireShop } from "@/lib/session";

export default async function ShopLayout({
  children,
  params,
}: LayoutProps<"/s/[shopId]">) {
  const { shopId } = await params;
  const { profile, shop, membership } = await requireShop(shopId);
  const t = await getTranslations();
  const base = `/s/${shop.id}`;

  const nav: NavItem[] = [
    { href: base, label: t("nav.home"), icon: "home", exact: true },
  ];
  if (membership.role !== "DEALER") {
    nav.push({ href: `${base}/devices`, label: t("nav.stock"), icon: "phone" });
  }
  if (membership.role !== "CASHIER") {
    nav.push({
      href: `${base}/consignments`,
      label: t("nav.consignments"),
      icon: "consign",
    });
  }
  nav.push(
    { href: `${base}/sales`, label: t("nav.sales"), icon: "sales" },
    {
      href: `${base}/balances`,
      label: t(membership.role === "DEALER" ? "nav.myBalance" : "nav.balances"),
      icon: "wallet",
    },
    { href: `${base}/customers`, label: t("nav.customers"), icon: "customers" },
  );
  if (membership.role === "OWNER") {
    nav.push(
      { href: `${base}/members`, label: t("nav.members"), icon: "members" },
      { href: `${base}/settings`, label: t("nav.settings"), icon: "settings" },
    );
  }
  nav.push({ href: "/", label: t("nav.spaces"), icon: "spaces", exact: true });

  return (
    <AppShell
      brand={shop.name}
      subtitle={t(`roles.${membership.role}`)}
      userName={profile.name}
      userId={profile.id}
      moreLabel={t("nav.more")}
      nav={nav}
    >
      {children}
    </AppShell>
  );
}
