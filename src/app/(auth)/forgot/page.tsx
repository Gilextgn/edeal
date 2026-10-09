import Link from "next/link";
import { useTranslations } from "next-intl";
import { ForgotForm } from "../auth-form";

// Mot de passe oublié : on demande l'e-mail du compte, un lien y est envoyé.
export default function ForgotPage() {
  const t = useTranslations("auth");
  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t.rich("forgotTitle", {
            accent: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </h1>
        <p className="mt-2 text-sm font-semibold">{t("forgotSubtitle")}</p>
      </div>
      <div className="mt-10">
        <ForgotForm />
      </div>
      <p className="mt-auto pt-10 text-center text-sm">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center font-semibold text-primary"
        >
          {t("backToLogin")}
        </Link>
      </p>
    </>
  );
}
