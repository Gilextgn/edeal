import { getFormatter, getTranslations } from "next-intl/server";
import { icons } from "@/components/icons";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  FormMessage,
  PageHeader,
} from "@/components/ui";
import { requirePatron } from "@/lib/session";
import { cancelInvitation } from "../actions";

export default async function MembersPage({
  params,
  searchParams,
}: PageProps<"/s/[shopId]/members">) {
  const { shopId } = await params;
  const { added } = await searchParams;
  const { supabase, profile, shop } = await requirePatron(shopId);
  const t = await getTranslations();
  const format = await getFormatter();

  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, role, commission_rate_bps, active, user_id, users(name, phone, email)")
      .eq("shop_id", shop.id)
      .order("created_at"),
    supabase
      .from("invitations")
      .select("id, phone, email, role, commission_rate_bps")
      .eq("shop_id", shop.id)
      .order("created_at"),
  ]);

  const rate = (bps: number) =>
    t("members.rateValue", {
      rate: format.number(bps / 10000, {
        style: "percent",
        maximumFractionDigits: 2,
      }),
    });
  const contact = (phone: string | null, email: string | null) =>
    phone ? `+${phone}` : email;

  return (
    <>
      <PageHeader
        title={t("members.title")}
        subtitle={t("members.subtitle")}
        action={
          <ButtonLink href={`/s/${shop.id}/members/new`} className="w-full sm:w-auto">
            {icons.plus}
            {t("members.add")}
          </ButtonLink>
        }
      />

      {added === "member" || added === "invitation" ? (
        <div className="mb-4">
          <FormMessage tone="success">
            {t(added === "member" ? "members.addedMember" : "members.addedInvitation")}
          </FormMessage>
        </div>
      ) : null}

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(members ?? []).map((member) => (
          <li key={member.id}>
            <Card className="flex h-full flex-col gap-3">
              <div>
                <p className="truncate font-semibold">
                  {member.users?.name}
                  {member.user_id === profile.id ? (
                    <span className="font-normal text-muted"> ({t("members.you")})</span>
                  ) : null}
                </p>
                <p className="truncate text-sm text-muted">
                  {contact(member.users?.phone ?? null, member.users?.email ?? null)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary">{t(`roles.${member.role}`)}</Badge>
                {member.role === "DEALER" ? (
                  <Badge>{rate(member.commission_rate_bps)}</Badge>
                ) : null}
                {member.active ? null : (
                  <Badge tone="danger">{t("members.inactive")}</Badge>
                )}
              </div>
              {member.role === "PATRON" ? null : (
                <ButtonLink
                  href={`/s/${shop.id}/members/${member.id}`}
                  variant="secondary"
                  className="mt-auto"
                >
                  {t("members.edit")}
                </ButtonLink>
              )}
            </Card>
          </li>
        ))}
      </ul>

      {invitations && invitations.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t("members.pendingTitle")}
          </h2>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {invitations.map((invitation) => (
              <li key={invitation.id}>
                <Card className="flex h-full flex-col gap-3">
                  <p className="truncate font-semibold">
                    {contact(invitation.phone, invitation.email)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{t(`roles.${invitation.role}`)}</Badge>
                    {invitation.role === "DEALER" ? (
                      <Badge>{rate(invitation.commission_rate_bps)}</Badge>
                    ) : null}
                    <Badge tone="warning">{t("members.pendingBadge")}</Badge>
                  </div>
                  <form
                    action={cancelInvitation.bind(null, shop.id, invitation.id)}
                    className="mt-auto"
                  >
                    <Button type="submit" variant="danger" className="w-full">
                      {t("members.cancelInvitation")}
                    </Button>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
