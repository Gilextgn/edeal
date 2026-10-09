import Link from "next/link";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { icons, type IconName } from "@/components/icons";
import { SplashArt } from "@/components/splash-art";
import { Badge, BrandMark, SectionTitle, focusRing } from "@/components/ui";
import { requireUser } from "@/lib/session";

const cardLink = `flex min-h-20 items-center gap-4 rounded-3xl bg-surface p-4 shadow-card transition hover:-translate-y-0.5 ${focusRing}`;

// Les trois gestes de l'application, montrés à un nouveau compte.
const STEPS: { key: "add" | "consign" | "follow"; icon: IconName }[] = [
  { key: "add", icon: "camera" },
  { key: "consign", icon: "consign" },
  { key: "follow", icon: "wallet" },
];

// Page d'arrivée après connexion. Elle dépend du profil :
// - une seule boutique : on va droit à son tableau de bord ;
// - aucune boutique : accueil qui présente l'application et propose de créer
//   sa boutique ou d'ouvrir son espace perso ;
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
  const firstName = profile.name.split(/\s+/)[0];
  const newcomer = shops.length === 0;
  // Un simple dealer ou caissier n'a pas à voir « Créer une boutique » en
  // évidence : le lien reste disponible, discret, dans « Compte ».
  const canCreateShop = newcomer || shops.some((m) => m.role === "OWNER");

  return (
    <div className="flex flex-col gap-8">
      {/* Bannière : le bonjour, ce que fait l'application, et les deux portes d'entrée. */}
      <section className="relative animate-rise overflow-hidden rounded-[2rem] bg-primary text-on-primary shadow-card">
        <div className="relative z-10 flex flex-col gap-5 p-6 sm:p-8 lg:max-w-[60%] lg:p-10">
          <p className="text-sm font-bold uppercase tracking-widest text-on-primary/80">
            {t("spaces.heroKicker", { name: firstName })}
          </p>
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight lg:text-4xl">
            {t(newcomer ? "spaces.heroTitle" : "spaces.heroTitleReturning")}
          </h1>
          <p className="max-w-xl text-base text-on-primary/90 lg:text-lg">
            {t(newcomer ? "spaces.heroText" : "spaces.subtitle")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {canCreateShop ? (
              <Link
                href="/shops/new"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-on-primary px-7 text-base font-bold text-primary shadow-card transition hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
              >
                {icons.plus}
                {t("spaces.createShop")}
              </Link>
            ) : null}
            <Link
              href="/perso"
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border-2 border-on-primary/70 px-7 text-base font-bold transition hover:bg-on-primary/10 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
            >
              {t("spaces.openPersonal")}
              {icons.chevron}
            </Link>
          </div>
        </div>
        <SplashArt className="pointer-events-none absolute right-0 bottom-0 hidden h-full max-h-80 w-auto lg:block xl:right-10" />
      </section>

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
            <li>
              <Link href="/perso" className={cardLink}>
                <BrandMark name={t("app.name")} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t("spaces.personal")}</span>
                  <span className="block text-sm text-muted">{t("spaces.personalHint")}</span>
                </span>
                <span className="text-muted">{icons.chevron}</span>
              </Link>
            </li>
          </ul>
        </section>
      ) : (
        <>
          {/* Comment ça marche, en trois gestes. */}
          <section>
            <h2 className="mb-4 text-xl font-extrabold tracking-tight lg:text-2xl">
              {t("spaces.stepsTitle")}
            </h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.key}
                  className="relative flex flex-col gap-3 rounded-3xl bg-surface p-6 shadow-card"
                >
                  <span className="flex items-center justify-between">
                    <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-tint-1 text-primary [&>svg]:size-7">
                      {icons[step.icon]}
                    </span>
                    <span aria-hidden className="text-5xl font-extrabold text-surface-2">
                      {index + 1}
                    </span>
                  </span>
                  <span className="text-lg font-bold">{t(`spaces.steps.${step.key}.title`)}</span>
                  <span className="text-muted">{t(`spaces.steps.${step.key}.text`)}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Les deux façons de commencer. */}
          <section className="grid gap-4 lg:grid-cols-2">
            {(["shop", "personal"] as const).map((choice) => (
              <div key={choice} className="flex flex-col gap-4 rounded-3xl bg-surface p-6 shadow-card lg:p-8">
                <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-on-primary [&>svg]:size-7">
                  {icons[choice === "shop" ? "spaces" : "account"]}
                </span>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">
                    {t(`spaces.choices.${choice}.title`)}
                  </h2>
                  <p className="mt-1 text-muted">{t(`spaces.choices.${choice}.text`)}</p>
                </div>
                <ul className="flex flex-col gap-2 text-sm font-medium">
                  {(["one", "two", "three"] as const).map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success [&>svg]:size-3.5">
                        {icons.check}
                      </span>
                      {t(`spaces.choices.${choice}.${point}`)}
                    </li>
                  ))}
                </ul>
                <Link
                  href={choice === "shop" ? "/shops/new" : "/perso"}
                  className={`mt-auto inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 font-bold transition active:scale-[0.98] sm:w-fit ${choice === "shop" ? "bg-primary text-on-primary shadow-card hover:bg-primary-hover" : "bg-surface-2 text-fg hover:bg-border"} ${focusRing}`}
                >
                  {t(`spaces.choices.${choice}.action`)}
                  {icons.chevron}
                </Link>
              </div>
            ))}
          </section>

          <p className="rounded-3xl bg-tint-2 p-5 text-sm font-medium">{t("spaces.noShops")}</p>
        </>
      )}
    </div>
  );
}
