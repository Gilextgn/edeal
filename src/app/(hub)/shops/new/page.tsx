import { getTranslations } from "next-intl/server";
import { ShopForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { createShop } from "../../actions";

export default async function NewShopPage() {
  const t = await getTranslations("shopForm");
  return (
    <div className="lg:max-w-2xl">
      <PageHeader title={t("createTitle")} subtitle={t("createSubtitle")} />
      <Card>
        <ShopForm action={createShop} submitLabel={t("create")} cancelHref="/" />
      </Card>
    </div>
  );
}
