import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ConfirmButton } from "@/components/confirm";
import { icons } from "@/components/icons";
import { Badge, Card, FormMessage, PageHeader, SectionTitle, focusRing } from "@/components/ui";
import { requireSuperadmin } from "@/lib/superadmin";
import { setUserSuspended } from "../../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOTICES = { suspended: "success", restored: "success", failed: "danger", self: "warning" } as const;

// Fiche d'un compte : identité, connexion, boutiques, activité, et la
// suspension. L'espace perso n'est montré qu'en chiffres : son contenu reste
// privé, même pour le superadmin.
export default async function AdminUserPage({
  params,
  searchParams,
}: PageProps<"/admin/users/[userId]">) {
  const { userId: me, admin } = await requireSuperadmin();
  const { userId } = await params;
  const raw = (await searchParams).notice;
  const notice = typeof raw === "string" ? raw : undefined;
  if (!UUID.test(userId)) notFound();
  const t = await getTranslations("admin");
  const roles = await getTranslations("roles");
  const format = await getFormatter();
  const count = { count: "exact", head: true } as const;

  const [{ data: user }, auth, memberships, personalDevices, personalSales, isAdmin] = await Promise.all([
    admin.from("users").select("id, name, phone, email, created_at").eq("id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
    admin
      .from("memberships")
      .select("id, role, active, commission_rate_bps, shops(id, name, suspended_at)")
      .eq("user_id", userId)
      .order("created_at"),
    admin.from("devices").select("id", count).eq("owner_user_id", userId),
    admin.from("sales").select("id", count).eq("seller_user_id", userId).eq("type", "PERSONAL"),
    admin.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (!user) notFound();

  const account = auth.data.user;
  const suspended = Boolean(account?.banned_until && new Date(account.banned_until) > new Date());
  const date = (value: string | null | undefined, withTime = false) =>
    value
      ? format.dateTime(new Date(value), withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" })
      : t("never");
  const tone = notice && notice in NOTICES ? NOTICES[notice as keyof typeof NOTICES] : null;
  const facts: [string, string][] = [
    [t("contact"), user.phone ? `+${user.phone}` : (user.email ?? "")],
    [t("provider"), t(`providers.${account?.app_metadata?.provider ?? "email"}`)],
    [t("joinedOn"), date(user.created_at)],
    [t("lastSignIn"), date(account?.last_sign_in_at, true)],
    [t("personalSpace"), t("personalCounts", { devices: personalDevices.count ?? 0, sales: personalSales.count ?? 0 })],
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <PageHeader title={user.name} subtitle={t("userSubtitle")} />
        <div className="-mt-3 flex flex-wrap gap-1.5">
          {isAdmin.data ? <Badge tone="primary">{t("superadmin")}</Badge> : null}
          <Badge tone={suspended ? "danger" : "success"}>{t(suspended ? "suspended" : "active")}</Badge>
        </div>
      </div>

      {tone ? <FormMessage tone={tone}>{t(`notices.user.${notice}`)}</FormMessage> : null}

      <Card>
        <dl className="grid gap-4 sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="font-semibold break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <section>
        <SectionTitle>{t("memberOf", { count: memberships.data?.length ?? 0 })}</SectionTitle>
        {(memberships.data ?? []).length === 0 ? (
          <Card className="text-muted">{t("noMembership")}</Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {(memberships.data ?? []).map((m) => (
              <li key={m.id}>
                <Link
                  href={`/admin/shops/${m.shops?.id}`}
                  className={`flex items-center gap-3 rounded-3xl bg-surface p-4 shadow-card transition hover:-translate-y-0.5 ${focusRing}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{m.shops?.name}</span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone="primary">{roles(m.role)}</Badge>
                      {m.active ? null : <Badge tone="danger">{t("memberInactive")}</Badge>}
                      {m.shops?.suspended_at ? <Badge tone="danger">{t("shopSuspended")}</Badge> : null}
                    </span>
                  </span>
                  <span className="text-muted">{icons.chevron}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {userId === me ? null : (
        <Card className="flex flex-col gap-3">
          <p className="font-bold">{t(suspended ? "restoreUserTitle" : "suspendUserTitle")}</p>
          <p className="text-sm text-muted">{t(suspended ? "restoreUserHint" : "suspendUserHint")}</p>
          <form action={setUserSuspended.bind(null, userId, !suspended)}>
            <ConfirmButton
              confirm={{
                message: t(suspended ? "confirmRestoreUser" : "confirmSuspendUser", { name: user.name }),
                tone: suspended ? "primary" : "danger",
                confirmLabel: t(suspended ? "restoreUser" : "suspendUser"),
              }}
              variant={suspended ? "primary" : "danger"}
              className="w-full sm:w-auto"
            >
              {t(suspended ? "restoreUser" : "suspendUser")}
            </ConfirmButton>
          </form>
        </Card>
      )}
    </div>
  );
}
