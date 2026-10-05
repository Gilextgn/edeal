import { getTranslations } from "next-intl/server";
import { ShopForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { requireOwner } from "@/lib/session";
import { updateShop } from "../actions";

export default async function ShopSettingsPage({
  params,
}: PageProps<"/s/[shopId]/settings">) {
  const { shopId } = await params;
  const { shop } = await requireOwner(shopId);
  const t = await getTranslations();

  return (
    <div className="lg:max-w-2xl">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <Card>
        <ShopForm
          action={updateShop.bind(null, shop.id)}
          initial={{
            name: shop.name,
            phone: shop.phone ?? "",
            address: shop.address ?? "",
          }}
          submitLabel={t("common.save")}
        />
      </Card>
    </div>
  );
}
