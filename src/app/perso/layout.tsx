import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";

export default async function PersonalLayout({ children }: LayoutProps<"/perso">) {
  const { profile } = await requireUser();
  const t = await getTranslations();

  return (
    <AppShell
      brand={t("app.name")}
      subtitle={t("personal.subtitle")}
      userName={profile.name}
      nav={[
        { href: "/perso", label: t("nav.home"), icon: "home", exact: true },
        { href: "/", label: t("nav.spaces"), icon: "spaces", exact: true },
        { href: "/account", label: t("nav.account"), icon: "account" },
      ]}
    >
      {children}
    </AppShell>
  );
}
