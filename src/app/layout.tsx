import type { Metadata, Viewport } from "next";
import { Pacifico, Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ServiceWorker } from "@/components/service-worker";
import { SplashArt } from "@/components/splash-art";
import "./globals.css";

// Police de toute l'application : droite et très lisible.
const body = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin"] });
// Écriture manuscrite, réservée au nom « eDeal » (écran d'ouverture, connexion).
const brand = Pacifico({ variable: "--font-brandmark", subsets: ["latin"], weight: "400" });

// Pose le thème avant le premier affichage, pour éviter un flash : le choix
// enregistré par l'utilisateur, sinon le réglage de son appareil.
// Note aussi si l'écran d'ouverture a déjà été montré dans cet onglet : il ne
// s'affiche qu'au lancement, pas à chaque rechargement.
const themeScript = `try{var t=localStorage.getItem("edeal:theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;if(sessionStorage.getItem("edeal:splash"))document.documentElement.dataset.splash="seen";else sessionStorage.setItem("edeal:splash","1")}catch(e){}`;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return {
    title: t("name"),
    description: t("description"),
    appleWebApp: { capable: true, title: t("name") },
  };
}

export const viewport: Viewport = {
  // Couleur de la barre d'état : l'orange de l'en-tête.
  themeColor: "#f4632b",
  // L'application occupe tout l'écran, encoche comprise (utile une fois
  // installée ou emballée en application mobile).
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("app");
  return (
    <html
      lang="fr"
      className={`${body.variable} ${brand.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {/* Écran d'ouverture : le nom et une illustration, plein écran, qui
            s'efface tout seul (styles `.splash` dans globals.css). */}
        <div aria-hidden className="splash">
          <p className="splash-name font-wordmark">{t("name")}</p>
          <p className="splash-tagline">{t("splashTagline")}</p>
          <SplashArt />
        </div>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
