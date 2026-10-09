import { getTranslations } from "next-intl/server";
import { MemberForm } from "@/components/forms";
import { Badge, Card, PageHeader, SectionTitle } from "@/components/ui";
import { requireOwner } from "@/lib/session";
import { addMember } from "../../actions";

export default async function NewMemberPage({
  params,
}: PageProps<"/s/[shopId]/members/new">) {
  const { shopId } = await params;
  const { supabase, profile, shop } = await requireOwner(shopId);
  const t = await getTranslations();

  // Qui est déjà là : le patron le voit avant d'ajouter quelqu'un, pour ne pas
  // saisir deux fois la même personne.
  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, role, active, user_id, users(name, phone, email)")
      .eq("shop_id", shop.id)
      .order("created_at"),
    supabase
      .from("invitations")
      .select("id, phone, email, role")
      .eq("shop_id", shop.id)
      .order("created_at"),
  ]);
  const contact = (phone: string | null | undefined, email: string | null | undefined) =>
    phone ? `+${phone}` : (email ?? "");
  const row = "flex items-center justify-between gap-3 px-4 py-3";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <PageHeader title={t("members.addTitle")} subtitle={t("members.addSubtitle")} />
        <Card>
          <MemberForm
            mode="add"
            action={addMember.bind(null, shop.id)}
            submitLabel={t("members.add")}
            cancelHref={`/s/${shop.id}/members`}
          />
        </Card>
      </div>

      <section>
        <SectionTitle>{t("members.alreadyTitle", { count: members?.length ?? 0 })}</SectionTitle>
        <ul className="divide-y divide-border overflow-hidden rounded-3xl bg-surface shadow-card">
          {(members ?? []).map((member) => (
            <li key={member.id} className={row}>
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {member.users?.name}
                  {member.user_id === profile.id ? (
                    <span className="font-normal text-muted"> ({t("members.you")})</span>
                  ) : null}
                </span>
                <span className="block truncate text-sm text-muted">
                  {contact(member.users?.phone, member.users?.email)}
                </span>
              </span>
              <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                <Badge tone="primary">{t(`roles.${member.role}`)}</Badge>
                {member.active ? null : <Badge tone="danger">{t("members.inactive")}</Badge>}
              </span>
            </li>
          ))}
          {(invitations ?? []).map((invitation) => (
            <li key={invitation.id} className={row}>
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {contact(invitation.phone, invitation.email)}
                </span>
                <span className="block text-sm text-muted">{t("members.pendingBadge")}</span>
              </span>
              <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                <Badge tone="primary">{t(`roles.${invitation.role}`)}</Badge>
                <Badge tone="warning">{t("members.invited")}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
