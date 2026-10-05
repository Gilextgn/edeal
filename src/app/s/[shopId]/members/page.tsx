import { getFormatter, getTranslations } from "next-intl/server";
import { ConfirmForm } from "@/components/confirm-form";
import { icons } from "@/components/icons";
import {
  ActionButton,
  ActionLink,
  Badge,
  ButtonLink,
  FormMessage,
  PageHeader,
  RowActions,
  SectionTitle,
  TableCard,
  Td,
  Th,
} from "@/components/ui";
import { requireOwner } from "@/lib/session";
import { cancelInvitation } from "../actions";

export default async function MembersPage({
  params,
  searchParams,
}: PageProps<"/s/[shopId]/members">) {
  const { shopId } = await params;
  const { added } = await searchParams;
  const { supabase, profile, shop } = await requireOwner(shopId);
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

  const rate = (role: string, bps: number) =>
    role === "DEALER"
      ? format.number(bps / 10000, { style: "percent", maximumFractionDigits: 2 })
      : "—";
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

      <TableCard>
        <thead>
          <tr>
            <Th>{t("members.member")}</Th>
            <Th>{t("members.role")}</Th>
            <Th className="hidden text-right sm:table-cell">{t("members.commission")}</Th>
            <Th className="hidden md:table-cell">{t("members.status")}</Th>
            <Th className="text-right">{t("list.actions")}</Th>
          </tr>
        </thead>
        <tbody>
          {(members ?? []).map((member) => (
            <tr key={member.id} className="hover:bg-surface-2/60">
              <Td>
                <p className="font-semibold">
                  {member.users?.name}
                  {member.user_id === profile.id ? (
                    <span className="font-normal text-muted"> ({t("members.you")})</span>
                  ) : null}
                </p>
                <p className="text-muted">
                  {contact(member.users?.phone ?? null, member.users?.email ?? null)}
                </p>
              </Td>
              <Td>
                <Badge tone="primary">{t(`roles.${member.role}`)}</Badge>
              </Td>
              <Td className="hidden text-right font-semibold sm:table-cell">
                {rate(member.role, member.commission_rate_bps)}
              </Td>
              <Td className="hidden md:table-cell">
                <Badge tone={member.active ? "success" : "danger"}>
                  {t(member.active ? "members.active" : "members.inactive")}
                </Badge>
              </Td>
              <Td>
                <RowActions>
                  {member.role === "OWNER" ? null : (
                    <ActionLink
                      kind="edit"
                      label={t("list.edit")}
                      href={`/s/${shop.id}/members/${member.id}`}
                    />
                  )}
                </RowActions>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableCard>

      {invitations && invitations.length > 0 ? (
        <section className="mt-8">
          <SectionTitle>{t("members.pendingTitle")}</SectionTitle>
          <TableCard>
            <thead>
              <tr>
                <Th>{t("members.contact")}</Th>
                <Th>{t("members.role")}</Th>
                <Th className="hidden text-right sm:table-cell">{t("members.commission")}</Th>
                <Th className="text-right">{t("list.actions")}</Th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => (
                <tr key={invitation.id} className="hover:bg-surface-2/60">
                  <Td>
                    <p className="font-semibold">{contact(invitation.phone, invitation.email)}</p>
                    <Badge tone="warning">{t("members.pendingBadge")}</Badge>
                  </Td>
                  <Td>
                    <Badge tone="primary">{t(`roles.${invitation.role}`)}</Badge>
                  </Td>
                  <Td className="hidden text-right font-semibold sm:table-cell">
                    {rate(invitation.role, invitation.commission_rate_bps)}
                  </Td>
                  <Td>
                    <RowActions>
                      <ConfirmForm
                        action={cancelInvitation.bind(null, shop.id, invitation.id)}
                        message={t("members.confirmCancel")}
                      >
                        <ActionButton kind="delete" label={t("members.cancelInvitation")} />
                      </ConfirmForm>
                    </RowActions>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        </section>
      ) : null}
    </>
  );
}
