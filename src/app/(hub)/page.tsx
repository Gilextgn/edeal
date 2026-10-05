import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { icons } from "@/components/icons";
import { Badge, BrandMark, ButtonLink, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/session";

const cardLink =
  "flex min-h-20 items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default async function SpacesPage() {
  const { supabase, profile } = await requireUser();
  const t = await getTranslations();
  const format = await getFormatter();

  // La base ne renvoie que les boutiques dont l'utilisateur est membre actif.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, commission_rate_bps, shops(id, name)")
    .eq("user_id", profile.id)
    .order("created_at");

  const shops = (memberships ?? []).filter((m) => m.shops);

  return (
    <>
      <PageHeader
        title={t("spaces.title", { name: profile.name })}
        subtitle={t("spaces.subtitle")}
        action={
          <ButtonLink href="/shops/new" className="w-full sm:w-auto">
            {icons.plus}
            {t("spaces.createShop")}
          </ButtonLink>
        }
      />

      <div className="flex flex-col gap-7">
        <Link href="/perso" className={`${cardLink} lg:max-w-xl`}>
          <BrandMark name={t("app.name")} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t("spaces.personal")}</span>
            <span className="block text-sm text-muted">{t("spaces.personalHint")}</span>
          </span>
          <span className="text-muted">{icons.chevron}</span>
        </Link>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t("spaces.shops")}
          </h2>
          {shops.length === 0 ? (
            <Card className="text-muted lg:max-w-xl">{t("spaces.noShops")}</Card>
          ) : (
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
          )}
        </section>
      </div>
    </>
  );
}
