import { getTranslations } from "next-intl/server";
import { AuthForm } from "../auth-form";
import { GoogleButton } from "../google-button";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("loginTitle")}</h1>
        <p className="mt-1 text-muted">{t("loginSubtitle")}</p>
      </div>
      <GoogleButton failed={error === "google"} />
      <AuthForm mode="login" />
    </div>
  );
}
