import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { loadPersonalAlerts } from "@/features/dashboard/alerts";
import { requireUser } from "@/lib/session";

export default async function PersonalLayout({ children }: LayoutProps<"/perso">) {
  const { profile } = await requireUser();
  const t = await getTranslations();

  return (
    <AppShell
      brand={t("app.name")}
      space="perso"
      role={t("personal.subtitle")}
      alerts={await loadPersonalAlerts(profile.id)}
      primaryAction={{ href: "/perso/devices/new", label: t("devices.add") }}
      search={{ href: "/perso/devices", placeholder: t("devices.searchShort") }}
      nav={[
        { href: "/perso", label: t("nav.home"), icon: "home", exact: true },
        { href: "/perso/devices", label: t("nav.devices"), icon: "phone" },
        { href: "/perso/sales", label: t("nav.sales"), icon: "sales" },
        { href: "/perso/customers", label: t("nav.customers"), icon: "customers" },
        { href: "/account", label: t("nav.account"), icon: "account" },
      ]}
    >
      {children}
    </AppShell>
  );
}
