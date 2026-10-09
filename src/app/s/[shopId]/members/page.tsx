import { headers } from "next/headers";
import { getFormatter, getTranslations } from "next-intl/server";
import { ConfirmForm } from "@/components/confirm-form";
import { icons } from "@/components/icons";
import { ListPagination } from "@/components/list";
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
  focusRing,
} from "@/components/ui";
import { parsePage, pageRange } from "@/domain/pagination";
import { whatsappUrl } from "@/domain/whatsapp";
import { env } from "@/lib/env";
import { requireOwner } from "@/lib/session";
import { cancelInvitation } from "../actions";

export default async function MembersPage({
  params,
  searchParams,
}: PageProps<"/s/[shopId]/members">) {
  const { shopId } = await params;
  const { added, page: rawPage } = await searchParams;
  const { supabase, profile, shop } = await requireOwner(shopId);
  const t = await getTranslations();
  const format = await getFormatter();
  const page = parsePage(rawPage);
  const { from, to } = pageRange(page);
  const path = `/s/${shop.id}/members`;

  const [{ data: members, count }, { data: invitations }, requestHeaders] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, role, commission_rate_bps, active, user_id, users(name, phone, email)", {
        count: "exact",
      })
      .eq("shop_id", shop.id)
      .order("created_at")
      .range(from, to),
    supabase
      .from("invitations")
      .select("id, phone, email, role, commission_rate_bps")
      .eq("shop_id", shop.id)
      .order("created_at"),
    headers(),
  ]);

  // L'application n'envoie ni SMS ni e-mail : le patron transmet lui-même
  // l'invitation, par WhatsApp (numéro) ou par e-mail, avec un message prêt.
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const signupUrl = `${protocol}://${host}/signup`;
  const inviteHref = (invitation: { phone: string | null; email: string | null; role: string }) => {
    const text = t("members.inviteMessage", {
      shop: shop.name,
      role: t(`roles.${invitation.role}`),
      contact: invitation.phone ? `+${invitation.phone}` : (invitation.email ?? ""),
      url: signupUrl,
    });
    return invitation.phone
      ? whatsappUrl(text, `+${invitation.phone}`, env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE)
      : `mailto:${invitation.email}?subject=${encodeURIComponent(
          t("members.inviteSubject", { shop: shop.name }),
        )}&body=${encodeURIComponent(text)}`;
  };

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
                  {/* Voir : le compte d'un dealer (ventes, ce qu'il doit, règlements). */}
                  {member.role === "DEALER" ? (
                    <ActionLink
                      kind="view"
                      label={t("list.view")}
                      href={`/s/${shop.id}/balances/${member.id}`}
                    />
                  ) : null}
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
      <ListPagination page={page} total={count ?? 0} path={path} />

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
                      <a
                        href={inviteHref(invitation)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold whitespace-nowrap text-on-primary transition-colors hover:bg-primary-hover ${focusRing}`}
                      >
                        {t(invitation.phone ? "members.sendWhatsapp" : "members.sendEmail")}
                      </a>
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
