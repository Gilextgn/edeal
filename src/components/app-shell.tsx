import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/session";
import { Shell, type NavItem, type ShellAlert } from "./shell";

export type { NavItem };

type Props = {
  // Nom affiché : celui de la boutique dans un espace boutique, « eDeal » sinon.
  brand: string;
  // Espace affiché : identifiant de la boutique, « perso », ou « hub » (écrans communs).
  space: string;
  // Profil de l'utilisateur dans cet espace (« Patron », « Dealer », « Espace privé »…).
  role: string;
  nav: NavItem[];
  alerts?: ShellAlert[];
  primaryAction?: { href: string; label: string };
  search?: { href: string; placeholder: string };
  children: ReactNode;
};

// Cadre commun à tous les écrans connectés : menu latéral repliable, barre du
// haut (recherche, espace courant, action, thème, alertes, compte) et, sur
// téléphone, onglets en bas.
export async function AppShell({
  brand,
  space,
  role,
  nav,
  alerts = [],
  primaryAction,
  search,
  children,
}: Props) {
  const { supabase, profile } = await requireUser();
  const t = await getTranslations();

  // Espaces de l'utilisateur, pour passer de l'un à l'autre depuis la barre du haut.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, shops(id, name)")
    .eq("user_id", profile.id)
    .order("created_at");

  const spaces = [
    ...(memberships ?? []).flatMap((m) =>
      m.shops
        ? [
            {
              href: `/s/${m.shops.id}`,
              label: m.shops.name,
              hint: t(`roles.${m.role}`),
              current: space === m.shops.id,
            },
          ]
        : [],
    ),
    {
      href: "/perso",
      label: t("spaces.personal"),
      hint: t("personal.subtitle"),
      current: space === "perso",
    },
  ];

  return (
    <Shell
      brand={brand}
      nav={nav}
      user={{ id: profile.id, name: profile.name, role }}
      spaces={spaces}
      alerts={alerts}
      primaryAction={primaryAction ?? null}
      search={search ?? null}
      labels={{
        menu: t("nav.menu"),
        more: t("nav.more"),
        theme: t("nav.theme"),
        alerts: t("dashboard.alerts"),
        noAlerts: t("dashboard.noAlerts"),
        spaces: t("nav.spaces"),
        account: t("nav.account"),
        logout: t("auth.logout"),
      }}
    >
      {children}
    </Shell>
  );
}
