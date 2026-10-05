import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/ui";

// Téléphone : bandeau de marque compact puis formulaire.
// Ordinateur : panneau de marque à gauche, formulaire à droite.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("app");
  const points = ["trace", "split", "private"] as const;

  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
      <section className="flex flex-col justify-between gap-10 bg-linear-to-br from-brand to-brand-2 px-5 py-6 text-on-brand lg:p-14">
        <div>
          <p className="text-2xl font-bold tracking-tight">{t("name")}</p>
          <p className="mt-1 text-sm opacity-90 lg:hidden">{t("description")}</p>
        </div>
        <div className="hidden lg:block">
          <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight">
            {t("tagline")}
          </h2>
          <ul className="mt-8 flex max-w-md flex-col gap-4 text-lg">
            {points.map((point) => (
              <li key={point} className="flex gap-3">
                <span aria-hidden className="mt-2.5 size-2 shrink-0 rounded-full bg-on-brand" />
                {t(`points.${point}`)}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-sm opacity-80 lg:block">{t("description")}</p>
      </section>

      <main className="flex items-start justify-center px-4 py-8 lg:items-center">
        <div className="w-full max-w-sm">
          <div className="mb-6 hidden lg:block">
            <BrandMark name={t("name")} size="lg" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
