import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { icons } from "@/components/icons";
import { ListPagination, ListSearch } from "@/components/list";
import { Badge, ButtonLink, Card, PageHeader, focusRing } from "@/components/ui";
import { pageRange, parsePage, parseSearch } from "@/domain/pagination";
import { requireSuperadmin } from "@/lib/superadmin";

// Tous les comptes de la plateforme, avec recherche (nom, e-mail, numéro).
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const { admin } = await requireSuperadmin();
  const { page: rawPage, q } = await searchParams;
  const page = parsePage(rawPage);
  const search = parseSearch(q);
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const { from, to } = pageRange(page);

  let query = admin
    .from("users")
    .select("id, name, phone, email, created_at, memberships(role, active)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (search) {
    const digits = search.replace(/\D/g, "");
    query = query.or(
      [`name.ilike.%${search}%`, `email.ilike.%${search}%`, digits ? `phone.ilike.%${digits}%` : null]
        .filter(Boolean)
        .join(","),
    );
  }
  const [{ data: users, count }, platformAdmins, authUsers] = await Promise.all([
    query,
    admin.from("platform_admins").select("user_id"),
    // L'état « suspendu » est tenu par le service d'authentification.
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const admins = new Set((platformAdmins.data ?? []).map((a) => a.user_id));
  const banned = new Set(
    (authUsers.data?.users ?? [])
      .filter((u) => u.banned_until && new Date(u.banned_until) > new Date())
      .map((u) => u.id),
  );

  return (
    <>
      <PageHeader
        title={t("usersTitle")}
        subtitle={t("usersSubtitle", { count: count ?? 0 })}
        action={
          <ButtonLink href="/admin/users/new" className="w-full sm:w-auto">
            {icons.plus}
            {t("createAccount")}
          </ButtonLink>
        }
      />
      <ListSearch path="/admin/users" value={search} placeholder={t("searchUsers")} />

      {!users || users.length === 0 ? (
        <Card className="text-muted">{t("noResult")}</Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {users.map((user) => {
            const shops = user.memberships.filter((m) => m.active).length;
            return (
              <li key={user.id}>
                <Link
                  href={`/admin/users/${user.id}`}
                  className={`flex items-center gap-3 rounded-3xl bg-surface p-4 shadow-card transition hover:-translate-y-0.5 ${focusRing}`}
                >
                  <span
                    aria-hidden
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-tint-1 font-bold text-primary"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{user.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {user.phone ? `+${user.phone}` : user.email}
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {admins.has(user.id) ? <Badge tone="primary">{t("superadmin")}</Badge> : null}
                      {banned.has(user.id) ? <Badge tone="danger">{t("suspended")}</Badge> : null}
                      <Badge>{t("shopCount", { count: shops })}</Badge>
                      <Badge>
                        {t("joined", {
                          date: format.dateTime(new Date(user.created_at), { dateStyle: "medium" }),
                        })}
                      </Badge>
                    </span>
                  </span>
                  <span className="text-muted">{icons.chevron}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <ListPagination page={page} total={count ?? 0} path="/admin/users" query={{ q: search }} />
    </>
  );
}
