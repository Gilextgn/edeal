import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MemberForm } from "@/components/forms";
import { Card, PageHeader } from "@/components/ui";
import { bpsToPercentInput } from "@/domain/commission";
import { requireOwner } from "@/lib/session";
import { updateMember } from "../../actions";

export default async function EditMemberPage({
  params,
}: PageProps<"/s/[shopId]/members/[membershipId]">) {
  const { shopId, membershipId } = await params;
  const { supabase, shop } = await requireOwner(shopId);
  const t = await getTranslations();

  const { data: members } = await supabase
    .from("memberships")
    .select("id, role, commission_rate_bps, active, users(name)")
    .eq("shop_id", shop.id);
  const member = members?.find((m) => m.id === membershipId);
  if (!member || member.role === "OWNER") notFound();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title={t("members.editTitle", { name: member.users?.name ?? "" })}
      />
      <Card>
        <MemberForm
          mode="edit"
          action={updateMember.bind(null, shop.id, member.id)}
          initial={{
            role: member.role,
            rate: bpsToPercentInput(member.commission_rate_bps),
            active: member.active,
          }}
          submitLabel={t("common.save")}
          cancelHref={`/s/${shop.id}/members`}
        />
      </Card>
    </div>
  );
}
