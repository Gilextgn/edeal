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

// Téléphone (usage principal) : écran blanc et sobre, le formulaire seul
// (maquette choisie par le propriétaire).
// Ordinateur : diaporama de photos à gauche, le même formulaire à droite.
//
// Les photos sont servies telles quelles (`unoptimized`) et jamais agrandies
// au-delà de leur taille : sur grand écran, la photo nette est posée, entière,
// sur une copie floue d'elle-même qui remplit le cadre.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("app");

  return (
    <div className="min-h-dvh bg-device lg:grid lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden text-on-brand lg:block lg:min-h-dvh">
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
              {/* Grand écran : la photo prend toute la hauteur, sans dépasser
                  sa largeur réelle (736 px), pour rester nette. */}
              <div className="absolute inset-0 lg:inset-6 lg:mx-auto lg:max-w-184">
                <Image
                  src={`/login/${file}.jpg`}
                  alt={t(`slides.${file}`)}
                  fill
                  unoptimized
                  priority={index === 0}
                  sizes="(min-width: 1024px) 46rem, 100vw"
                  className="object-cover lg:rounded-3xl lg:object-contain"
                />
              </div>
            </div>
          ))}
        </div>
        {/* Voile sombre en haut et en bas : garde le texte lisible. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-b from-device/70 via-transparent to-device/90"
        />

        <div className="relative flex h-full flex-col justify-between p-5 pb-12 lg:p-10">
          <p className="font-wordmark text-4xl lg:text-5xl">{t("name")}</p>

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

      {/* Téléphone : écran blanc, sans photo ; le lien du bas reste en bas. */}
      <main className="flex min-h-dvh justify-center bg-surface px-6 pt-[14dvh] pb-8 lg:items-center lg:px-8 lg:py-10">
        <div className="flex w-full max-w-sm animate-rise flex-col lg:min-h-[36rem]">{children}</div>
      </main>
    </div>
  );
}
