import Link from "next/link";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { icons } from "@/components/icons";
import { Badge, BrandMark, ButtonLink, Card, PageHeader, SectionTitle } from "@/components/ui";
import { requireUser } from "@/lib/session";

const cardLink =
  "flex min-h-20 items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

// Page d'arrivée après connexion. Elle dépend du profil :
// - une seule boutique : on va droit à son tableau de bord ;
// - aucune boutique : accueil avec l'espace perso et la création de boutique ;
// - plusieurs boutiques : choix de l'espace.
// « ?spaces=1 » force l'affichage de la liste (menu « Espaces »).
export default async function SpacesPage({ searchParams }: PageProps<"/">) {
  const { spaces: showList } = await searchParams;
  const { supabase, profile } = await requireUser();

  // La base ne renvoie que les boutiques dont l'utilisateur est membre actif.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, commission_rate_bps, shops(id, name)")
    .eq("user_id", profile.id)
    .order("created_at");
  const shops = (memberships ?? []).filter((m) => m.shops);

  if (!showList && shops.length === 1) redirect(`/s/${shops[0].shops!.id}`);

  const t = await getTranslations();
  const format = await getFormatter();
  // Un simple dealer ou caissier n'a pas à voir « Créer une boutique » en
  // évidence : le lien reste disponible, discret, dans « Compte ».
  const canCreateShop = shops.length === 0 || shops.some((m) => m.role === "OWNER");

  return (
    <>
      <PageHeader
        title={t("spaces.title", { name: profile.name })}
        subtitle={t(shops.length === 0 ? "spaces.welcome" : "spaces.subtitle")}
        action={
          canCreateShop ? (
            <ButtonLink href="/shops/new" className="w-full sm:w-auto">
              {icons.plus}
              {t("spaces.createShop")}
            </ButtonLink>
          ) : null
        }
      />

      <div className="flex flex-col gap-7">
        {shops.length > 0 ? (
          <section>
            <SectionTitle>{t("spaces.shops")}</SectionTitle>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shops.map((m) => (
                <li key={m.shops!.id}>
                  <Link href={`/s/${m.shops!.id}`} className={cardLink}>
                    <BrandMark name={m.shops!.name} size="lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{m.shops!.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge tone="primary">{t(`roles.${m.role}`)}</Badge>
                        {m.role === "DEALER" ? (
                          <span className="text-sm text-muted">
                            {t("spaces.rate", {
                              rate: format.number(m.commission_rate_bps / 10000, {
                                style: "percent",
                                maximumFractionDigits: 2,
                              }),
                            })}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="text-muted">{icons.chevron}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <Card className="text-muted lg:max-w-xl">{t("spaces.noShops")}</Card>
        )}

        <section>
          <SectionTitle>{t("spaces.personalSection")}</SectionTitle>
          <Link href="/perso" className={`${cardLink} lg:max-w-xl`}>
            <BrandMark name={t("app.name")} size="lg" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t("spaces.personal")}</span>
              <span className="block text-sm text-muted">{t("spaces.personalHint")}</span>
            </span>
            <span className="text-muted">{icons.chevron}</span>
          </Link>
        </section>
      </div>
    </>
  );
}
