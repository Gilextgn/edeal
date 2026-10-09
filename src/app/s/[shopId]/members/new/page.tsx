import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MemberForm } from "@/components/forms";
import { icons } from "@/components/icons";
import { Card, PageHeader, focusRing } from "@/components/ui";
import { requireOwner } from "@/lib/session";
import { addMember } from "../../actions";

export default async function NewMemberPage({
  params,
}: PageProps<"/s/[shopId]/members/new">) {
  const { shopId } = await params;
  const { supabase, shop } = await requireOwner(shopId);
  const t = await getTranslations("members");

  // Combien de personnes sont déjà là : la liste elle-même est sur l'écran
  // Membres, pour garder ce formulaire court.
  const [{ count: members }, { count: invitations }] = await Promise.all([
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
    supabase.from("invitations").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <PageHeader title={t("addTitle")} subtitle={t("addSubtitle")} />
        <Link
          href={`/s/${shop.id}/members`}
          className={`flex min-h-16 items-center gap-3 rounded-3xl bg-surface p-4 shadow-card transition hover:-translate-y-0.5 ${focusRing}`}
        >
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-tint-1 text-primary">
            {icons.members}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t("seeRegistered")}</span>
            <span className="block text-sm text-muted">
              {t("registeredCount", { members: members ?? 0, invitations: invitations ?? 0 })}
            </span>
          </span>
          <span className="text-muted">{icons.chevron}</span>
        </Link>
      </div>
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
