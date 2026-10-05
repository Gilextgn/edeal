import type { Metadata, Viewport } from "next";
import { Dancing_Script, Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

// Police droite, très lisible : textes, chiffres, tableaux, formulaires.
const body = Plus_Jakarta_Sans({ variable: "--font-body", subsets: ["latin"] });
// Cursive : marque et grands titres.
const script = Dancing_Script({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["700"],
});

// Pose le thème avant le premier affichage, pour éviter un flash : le choix
// enregistré par l'utilisateur, sinon le réglage de son appareil.
const themeScript = `try{var t=localStorage.getItem("edeal:theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return {
    title: t("name"),
    description: t("description"),
    appleWebApp: { capable: true, title: t("name") },
  };
}

export const viewport: Viewport = {
  themeColor: "#022C22",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${body.variable} ${script.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
