import Link from "next/link";
import { useTranslations } from "next-intl";
import { AuthForm } from "../auth-form";

export default function LoginPage() {
  const t = useTranslations("auth");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">{t("loginTitle")}</h1>
      <AuthForm mode="login" />
      <p className="text-sm text-muted">
        {t("noAccount")}{" "}
        <Link
          href="/signup"
          className="inline-flex min-h-11 items-center font-semibold text-link underline"
        >
          {t("goToSignup")}
        </Link>
      </p>
    </div>
  );
}
