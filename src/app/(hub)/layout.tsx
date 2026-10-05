import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";

export default async function HubLayout({ children }: LayoutProps<"/">) {
  const { profile } = await requireUser();
  const t = await getTranslations();

  return (
    <AppShell
      brand={t("app.name")}
      subtitle={t("spaces.hubSubtitle")}
      userName={profile.name}
      userId={profile.id}
      moreLabel={t("nav.more")}
      nav={[
        { href: "/", label: t("nav.spaces"), icon: "spaces", exact: true },
        { href: "/account", label: t("nav.account"), icon: "account" },
      ]}
    >
      {children}
    </AppShell>
  );
}
