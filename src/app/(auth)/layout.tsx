import Image from "next/image";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

// Photos du diaporama (public/login). Le nom sert aussi de clé pour le texte
// de remplacement, dans messages/fr.json.
const SLIDES = [
  "iphone-13-fan",
  "samsung-ultra",
  "iphone-boxes",
  "samsung-green",
  "iphone-13-box",
  "ipad-fan",
] as const;

// Téléphone (usage principal) : le diaporama occupe le haut de l'écran et le
// formulaire glisse par-dessus comme une feuille arrondie.
// Ordinateur : diaporama à gauche, formulaire à droite.
//
// Les photos sont servies telles quelles (`unoptimized`) et jamais agrandies
// au-delà de leur taille : sur grand écran, la photo nette est posée, entière,
// sur une copie floue d'elle-même qui remplit le cadre.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("app");

  return (
    <div className="min-h-dvh bg-device lg:grid lg:grid-cols-[1.1fr_1fr]">
      <section className="relative h-[40dvh] min-h-64 overflow-hidden text-on-brand lg:h-auto lg:min-h-dvh">
        <div className="absolute inset-0">
          {SLIDES.map((file, index) => (
            <div
              key={file}
              className="slide absolute inset-0"
              style={{ "--slide": index } as CSSProperties}
            >
              {/* Fond : la même photo, floue et assombrie (grand écran seulement). */}
              <Image
                src={`/login/${file}.jpg`}
                alt=""
                aria-hidden
                fill
                unoptimized
                sizes="55vw"
                className="hidden scale-110 object-cover opacity-50 blur-2xl lg:block"
              />
              <Image
                src={`/login/${file}.jpg`}
                alt={t(`slides.${file}`)}
                fill
                unoptimized
                priority={index === 0}
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover lg:object-contain lg:p-24"
              />
            </div>
          ))}
        </div>
        {/* Voile sombre en haut et en bas : garde le texte lisible. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-b from-device/70 via-transparent to-device/90"
        />

        <div className="relative flex h-full flex-col justify-between p-5 pb-10 lg:p-10">
          <p className="text-3xl font-extrabold tracking-tight lg:text-4xl">{t("name")}</p>

          <div>
            <h2 className="max-w-xl text-xl font-bold leading-snug lg:text-3xl">{t("tagline")}</h2>
            <p className="mt-1 hidden max-w-md text-on-brand-muted lg:block">{t("description")}</p>
            {/* Repère de progression : un trait par photo. */}
            <div aria-hidden className="mt-3 flex gap-1.5 lg:mt-5">
              {SLIDES.map((file, index) => (
                <span key={file} className="relative h-1 w-8 overflow-hidden rounded-full bg-on-brand/30">
                  <span
                    className="slide-dot absolute inset-0 rounded-full bg-on-brand"
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
