import Link from "next/link";
import { useTranslations } from "next-intl";
import { AuthForm } from "../auth-form";

export default function LoginPage() {
  const t = useTranslations("auth");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-5xl leading-tight">{t("loginTitle")}</h1>
        <p className="mt-1 text-muted">{t("loginSubtitle")}</p>
      </div>
      <AuthForm mode="login" />
      <p className="text-sm text-muted">
        {t("noAccount")}{" "}
        <Link
          href="/signup"
          className="inline-flex min-h-11 items-center font-semibold text-primary underline"
        >
          {t("goToSignup")}
        </Link>
      </p>
    </div>
  );
}
