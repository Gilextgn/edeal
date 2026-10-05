import Link from "next/link";
import { useTranslations } from "next-intl";
import { AuthForm } from "../auth-form";

export default function SignupPage() {
  const t = useTranslations("auth");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">{t("signupTitle")}</h1>
      <AuthForm mode="signup" />
      <p className="text-sm text-muted">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center font-semibold text-link underline"
        >
          {t("goToLogin")}
        </Link>
      </p>
    </div>
  );
}
