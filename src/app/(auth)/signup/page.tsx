import Link from "next/link";
import { useTranslations } from "next-intl";
import { AuthForm } from "../auth-form";
import { GoogleButton } from "../google-button";

// Même présentation que la connexion.
export default function SignupPage() {
  const t = useTranslations("auth");
  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t.rich("signupTitle", {
            accent: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </h1>
        <p className="mt-2 text-sm font-semibold">{t("signupSubtitle")}</p>
      </div>
      <div className="mt-10 flex flex-col gap-6">
        <AuthForm mode="signup" />
        <GoogleButton failed={false} />
      </div>
      <p className="mt-auto pt-10 text-center text-sm">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center font-semibold text-primary"
        >
          {t("goToLogin")}
        </Link>
      </p>
    </>
  );
}
