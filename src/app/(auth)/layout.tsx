import Image from "next/image";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { PalettePicker } from "@/components/palette-picker";

// Photos du diaporama (public/login). `position` cadre le sujet quand la
// photo est rognée ; `alt` est une clé de messages/fr.json.
const SLIDES = [
  { file: "iphone-13-fan", position: "object-center" },
  { file: "samsung-ultra", position: "object-center" },
  { file: "iphone-boxes", position: "object-center" },
  { file: "samsung-green", position: "object-center" },
  { file: "iphone-13-box", position: "object-top" },
  { file: "ipad-fan", position: "object-center" },
] as const;

// Téléphone (usage principal) : le diaporama occupe le haut de l'écran et le
// formulaire glisse par-dessus comme une feuille arrondie.
// Ordinateur : diaporama plein cadre à gauche, formulaire à droite.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("app");

  return (
    <div className="min-h-dvh bg-device lg:grid lg:grid-cols-[1.15fr_1fr]">
      <section className="relative h-[40dvh] min-h-64 overflow-hidden text-on-brand lg:h-auto lg:min-h-dvh">
        {/* Fondu enchaîné et zoom très lent, six secondes par photo (voir .slide). */}
        <div className="absolute inset-0">
          {SLIDES.map((slide, index) => (
            <div
              key={slide.file}
              className="slide absolute inset-0"
              style={{ "--slide": index } as CSSProperties}
            >
              <Image
                src={`/login/${slide.file}.jpg`}
                alt={t(`slides.${slide.file}`)}
                fill
                priority={index === 0}
                sizes="(min-width: 1024px) 55vw, 100vw"
                className={`object-cover ${slide.position}`}
              />
            </div>
          ))}
        </div>
        {/* Voile sombre : garde le texte lisible sur toutes les photos. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-b from-device/70 via-device/10 to-device/90"
        />

        <div className="relative flex h-full flex-col justify-between p-5 pb-10 lg:p-12">
          <div className="flex items-start justify-between gap-4">
            <p className="font-display text-5xl leading-none drop-shadow-lg lg:text-6xl">
              {t("name")}
            </p>
            <div className="rounded-full bg-device/50 px-1 backdrop-blur">
              <PalettePicker tone="brand" />
            </div>
          </div>

          <div>
            <h2 className="max-w-xl font-display text-3xl leading-tight drop-shadow-lg lg:text-6xl">
              {t("tagline")}
            </h2>
            <p className="mt-2 hidden max-w-md text-on-brand/85 lg:block">{t("description")}</p>
            {/* Repère de progression : un trait par photo. */}
            <div aria-hidden className="mt-4 flex gap-1.5 lg:mt-6">
              {SLIDES.map((slide, index) => (
                <span key={slide.file} className="relative h-1 w-8 overflow-hidden rounded-full bg-on-brand/30">
                  <span
                    className="slide-dot absolute inset-0 rounded-full bg-accent"
                    style={{ "--slide": index } as CSSProperties}
                  />
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="relative -mt-6 flex min-h-[calc(60dvh+1.5rem)] items-start justify-center rounded-t-[2rem] bg-bg px-5 pb-10 pt-8 lg:mt-0 lg:min-h-dvh lg:items-center lg:rounded-none lg:px-8">
        <div className="w-full max-w-sm animate-rise">{children}</div>
      </main>
    </div>
  );
}
