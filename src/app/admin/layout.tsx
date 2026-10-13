import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { requireSuperadmin } from "@/lib/superadmin";

// Espace superadmin : toute la plateforme. Introuvable pour les autres comptes.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireSuperadmin();
  const t = await getTranslations();

  return (
    <AppShell
      brand={t("admin.brand")}
      space="admin"
      role={t("admin.role")}
      primaryAction={{ href: "/admin/users/new", label: t("admin.createAccount") }}
      search={{ href: "/admin/users", placeholder: t("admin.searchUsers") }}
      nav={[
        { href: "/admin", label: t("admin.nav.overview"), icon: "trend", exact: true },
        { href: "/admin/users", label: t("admin.nav.users"), icon: "customers" },
        { href: "/admin/shops", label: t("admin.nav.shops"), icon: "spaces" },
        { href: "/account", label: t("nav.account"), icon: "account" },
      ]}
    >
      {children}
    </AppShell>
  );
}
