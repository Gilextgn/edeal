import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FormMessage } from "@/components/ui";
import { AuthForm } from "../auth-form";
import { GoogleButton } from "../google-button";

// Écran de connexion, tout en blanc : titre centré, deux champs, le bouton,
// Google, et en bas le lien vers l'inscription.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t.rich("loginTitle", {
            accent: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </h1>
        <p className="mt-2 text-sm font-semibold">{t("loginSubtitle")}</p>
      </div>
      <div className="mt-10 flex flex-col gap-6">
        {error === "link" ? (
          <FormMessage tone="danger">{t("errors.link")}</FormMessage>
        ) : null}
        {error === "timeout" ? <FormMessage tone="warning">{t("timedOut")}</FormMessage> : null}
        <AuthForm mode="login" />
        <GoogleButton failed={error === "google"} />
      </div>
      <p className="mt-auto pt-10 text-center text-sm">
        {t("noAccount")}{" "}
        <Link
          href="/signup"
          className="inline-flex min-h-11 items-center font-semibold text-primary"
        >
          {t("goToSignup")}
        </Link>
      </p>
    </>
  );
}
