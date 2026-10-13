import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { icons } from "@/components/icons";
import { ListPagination, ListSearch } from "@/components/list";
import { Badge, BrandMark, Card, PageHeader, focusRing } from "@/components/ui";
import { pageRange, parsePage, parseSearch } from "@/domain/pagination";
import { requireSuperadmin } from "@/lib/superadmin";

// Toutes les boutiques de la plateforme, avec leur patron et leur taille.
export default async function AdminShopsPage({ searchParams }: PageProps<"/admin/shops">) {
  const { admin } = await requireSuperadmin();
  const { page: rawPage, q } = await searchParams;
  const page = parsePage(rawPage);
  const search = parseSearch(q);
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const { from, to } = pageRange(page);

  let query = admin
    .from("shops")
    .select("id, name, created_at, suspended_at, memberships(role, active, users(name)), devices(count)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (search) query = query.ilike("name", `%${search}%`);
  const { data: shops, count } = await query;

  return (
    <>
      <PageHeader title={t("shopsTitle")} subtitle={t("shopsSubtitle", { count: count ?? 0 })} />
      <ListSearch path="/admin/shops" value={search} placeholder={t("searchShops")} />

      {!shops || shops.length === 0 ? (
        <Card className="text-muted">{t(search ? "noResult" : "noShops")}</Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shops.map((shop) => {
            const owner = shop.memberships.find((m) => m.role === "OWNER")?.users?.name;
            const members = shop.memberships.filter((m) => m.active).length;
            return (
              <li key={shop.id}>
                <Link
                  href={`/admin/shops/${shop.id}`}
                  className={`flex h-full items-center gap-3 rounded-3xl bg-surface p-4 shadow-card transition hover:-translate-y-0.5 ${focusRing}`}
                >
                  <BrandMark name={shop.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{shop.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {t("ownedBy", { name: owner ?? "—" })}
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {shop.suspended_at ? <Badge tone="danger">{t("suspended")}</Badge> : null}
                      <Badge>{t("memberCount", { count: members })}</Badge>
                      <Badge>{t("deviceCount", { count: shop.devices[0]?.count ?? 0 })}</Badge>
                      <Badge>
                        {t("created", {
                          date: format.dateTime(new Date(shop.created_at), { dateStyle: "medium" }),
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
      <ListPagination page={page} total={count ?? 0} path="/admin/shops" query={{ q: search }} />
    </>
  );
}
