import { getTranslations } from "next-intl/server";
import { MemberForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { requirePatron } from "@/lib/session";
import { addMember } from "../../actions";

export default async function NewMemberPage({
  params,
}: PageProps<"/s/[shopId]/members/new">) {
  const { shopId } = await params;
  const { shop } = await requirePatron(shopId);
  const t = await getTranslations("members");

  return (
    <div className="lg:max-w-2xl">
      <PageHeader title={t("addTitle")} subtitle={t("addSubtitle")} />
      <Card>
        <MemberForm
          mode="add"
          action={addMember.bind(null, shop.id)}
          submitLabel={t("add")}
          cancelHref={`/s/${shop.id}/members`}
        />
      </Card>
    </div>
  );
}
