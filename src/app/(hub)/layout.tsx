import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";

export default async function HubLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations();

  return (
    <AppShell
      brand={t("app.name")}
      space="hub"
      role={t("spaces.hubSubtitle")}
      nav={[
        { href: "/?spaces=1", label: t("nav.spaces"), icon: "spaces", exact: true },
        { href: "/account", label: t("nav.account"), icon: "account" },
      ]}
    >
      {children}
    </AppShell>
  );
}
