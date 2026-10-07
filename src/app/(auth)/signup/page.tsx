import Link from "next/link";
import { useTranslations } from "next-intl";
import { AuthForm } from "../auth-form";
import { GoogleButton } from "../google-button";

export default function SignupPage() {
  const t = useTranslations("auth");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("signupTitle")}</h1>
        <p className="mt-1 text-muted">{t("signupSubtitle")}</p>
      </div>
      <GoogleButton failed={false} />
      <AuthForm mode="signup" />
      <p className="text-sm text-muted">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center font-semibold text-primary underline"
        >
          {t("goToLogin")}
        </Link>
      </p>
    </div>
  );
}
