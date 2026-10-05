import { useTranslations } from "next-intl";
import { MockCard, MockLine, PhoneMock } from "@/components/phone-mock";
import { formatMoney } from "@/domain/money";

// Téléphone : bandeau de marque avec les appareils animés, puis le formulaire.
// Ordinateur : grande scène animée à gauche, formulaire à droite.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations();
  const points = ["trace", "split", "private"] as const;
  const money = (amount: number) => formatMoney(amount, "XOF");

  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-[1.1fr_1fr] lg:grid-rows-1">
      <section className="relative flex flex-col overflow-hidden bg-linear-to-br from-brand via-brand to-brand-2 px-5 pb-0 pt-6 text-on-brand lg:p-12">
        {/* Halos lumineux en arrière-plan. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 animate-glow rounded-full bg-accent/30 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 size-96 animate-glow rounded-full bg-brand-2/60 blur-3xl [animation-delay:-3s]"
        />

        <div className="relative z-10">
          <p className="font-display text-5xl leading-none lg:text-6xl">{t("app.name")}</p>
          <p className="mt-2 text-sm text-on-brand-muted">{t("app.description")}</p>
        </div>

        <div className="relative z-10 mt-8 hidden lg:block">
          <h2 className="max-w-lg font-display text-5xl leading-tight xl:text-6xl">
            {t("app.tagline")}
          </h2>
          <ul className="mt-6 hidden max-w-md flex-col gap-3 2xl:flex">
            {points.map((point) => (
              <li key={point} className="flex gap-3 text-on-brand-muted">
                <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-accent" />
                {t(`app.points.${point}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* Scène : trois téléphones qui flottent, chacun à son rythme. */}
        <div className="relative z-10 mx-auto mt-4 flex h-44 w-full max-w-md items-start justify-center gap-4 lg:mt-auto lg:h-80 lg:max-w-none lg:justify-start lg:gap-8 lg:pt-6">
          <div className="w-24 animate-float-slow [animation-delay:-2s] lg:w-44 lg:-rotate-6">
            <PhoneMock variant="punch">
              <p className="text-[9px] font-bold lg:text-sm">Galaxy S24 Ultra</p>
              <MockCard>
                <MockLine width="w-2/3" />
                <p className="text-[9px] font-bold text-primary lg:text-base">{money(610000)}</p>
              </MockCard>
              <span className="self-start rounded-full bg-primary-soft px-2 py-0.5 text-[8px] font-bold text-on-primary-soft lg:text-xs">
                {t("devices.status.IN_STOCK")}
              </span>
              <MockLine />
              <MockLine width="w-1/2" />
            </PhoneMock>
          </div>

          <div className="w-28 animate-float lg:w-52">
            <PhoneMock variant="island">
              <p className="text-[9px] font-bold lg:text-sm">iPhone 15 Pro</p>
              <MockCard>
                <p className="text-[8px] text-muted lg:text-xs">{t("sales.yourShare")}</p>
                <p className="text-[10px] font-bold text-primary lg:text-lg">{money(35000)}</p>
              </MockCard>
              <MockCard>
                <p className="text-[8px] text-muted lg:text-xs">{t("sales.shopShare")}</p>
                <p className="text-[10px] font-bold lg:text-lg">{money(485000)}</p>
              </MockCard>
              <span className="self-start rounded-full bg-accent px-2 py-0.5 text-[8px] font-bold text-on-accent lg:text-xs">
                {t("devices.status.SOLD")}
              </span>
            </PhoneMock>
          </div>

          <div className="w-24 animate-float-slow [animation-delay:-5s] lg:w-40 lg:rotate-6">
            <PhoneMock variant="classic">
              <p className="text-[9px] font-bold lg:text-sm">Galaxy S8</p>
              <MockLine width="w-3/4" />
              <MockCard>
                <MockLine width="w-1/2" tone="bg-primary-soft" />
                <p className="text-[9px] font-bold text-primary lg:text-base">{money(55000)}</p>
              </MockCard>
              <span className="self-start rounded-full bg-warning-soft px-2 py-0.5 text-[8px] font-bold text-warning lg:text-xs">
                {t("devices.status.CONSIGNED")}
              </span>
            </PhoneMock>
          </div>
        </div>
      </section>

      <main className="flex items-start justify-center px-4 py-8 lg:items-center">
        <div className="w-full max-w-sm animate-rise">{children}</div>
      </main>
    </div>
  );
}
