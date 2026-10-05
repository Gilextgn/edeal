import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";

export default async function PersonalHomePage() {
  const t = await getTranslations("personal");
  return (
    <>
      <PageHeader title={t("title")} />
      <Card className="text-muted lg:max-w-xl">{t("empty")}</Card>
    </>
  );
}
