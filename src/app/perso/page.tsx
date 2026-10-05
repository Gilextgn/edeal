import { getTranslations } from "next-intl/server";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/session";

export default async function PersonalHomePage() {
  const { supabase, profile } = await requireUser();
  const t = await getTranslations("personal");

  const { count } = await supabase
    .from("devices")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", profile.id)
    .eq("status", "IN_STOCK");

  return (
    <>
      <PageHeader
        title={t("title")}
        action={
          <ButtonLink href="/perso/devices" className="w-full sm:w-auto">
            {t("viewDevices")}
          </ButtonLink>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-muted">{t("devices")}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{count ?? 0}</p>
        </Card>
      </div>
      <Card className="mt-4 text-muted lg:max-w-xl">{t("empty")}</Card>
    </>
  );
}
