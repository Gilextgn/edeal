import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/forms";
import { LogoutButton } from "@/components/offline";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { updateProfile } from "../actions";

export default async function AccountPage() {
  const { profile } = await requireUser();
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-4 lg:max-w-2xl">
      <PageHeader title={t("account.title")} subtitle={t("account.subtitle")} />
      <Card>
        <ProfileForm action={updateProfile} name={profile.name}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {profile.phone ? (
              <div>
                <dt className="text-muted">{t("account.phone")}</dt>
                <dd className="font-medium">+{profile.phone}</dd>
              </div>
            ) : null}
            {profile.email ? (
              <div>
                <dt className="text-muted">{t("account.email")}</dt>
                <dd className="font-medium">{profile.email}</dd>
              </div>
            ) : null}
          </dl>
        </ProfileForm>
      </Card>

      <Card className="flex flex-col gap-3">
        <div>
          <p className="font-semibold">{t("account.ownShopTitle")}</p>
          <p className="text-sm text-muted">{t("account.ownShopHint")}</p>
        </div>
        <ButtonLink href="/shops/new" variant="secondary" className="w-full sm:w-auto sm:self-start">
          {t("spaces.createShop")}
        </ButtonLink>
      </Card>

      <div>
        <LogoutButton>{t("auth.logout")}</LogoutButton>
      </div>
    </div>
  );
}
