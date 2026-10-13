import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ConfirmButton } from "@/components/confirm";
import { icons } from "@/components/icons";
import { Badge, Card, FormMessage, PageHeader, SectionTitle, focusRing } from "@/components/ui";
import { formatMoney } from "@/domain/money";
import { requireSuperadmin } from "@/lib/superadmin";
import { setShopSuspended } from "../../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOTICES = { suspended: "success", restored: "success", failed: "danger" } as const;

// Fiche d'une boutique : membres, chiffres, invitations, et la suspension.
export default async function AdminShopPage({
  params,
  searchParams,
}: PageProps<"/admin/shops/[shopId]">) {
  const { admin } = await requireSuperadmin();
  const { shopId } = await params;
  const raw = (await searchParams).notice;
  const notice = typeof raw === "string" ? raw : undefined;
  if (!UUID.test(shopId)) notFound();
  const t = await getTranslations("admin");
  const roles = await getTranslations("roles");
  const format = await getFormatter();
  const count = { count: "exact", head: true } as const;

  const [{ data: shop }, members, invitations, inStock, consigned, sold, sales, consignments] =
    await Promise.all([
      admin.from("shops").select("id, name, phone, address, currency, created_at, suspended_at").eq("id", shopId).maybeSingle(),
      admin
        .from("memberships")
        .select("id, role, active, commission_rate_bps, users(id, name, phone, email)")
        .eq("shop_id", shopId)
        .order("created_at"),
      admin.from("invitations").select("id, phone, email, role").eq("shop_id", shopId),
      admin.from("devices").select("id", count).eq("shop_id", shopId).eq("status", "IN_STOCK"),
      admin.from("devices").select("id", count).eq("shop_id", shopId).eq("status", "CONSIGNED"),
      admin.from("devices").select("id", count).eq("shop_id", shopId).eq("status", "SOLD"),
      admin.from("sales").select("sale_price").eq("shop_id", shopId).eq("status", "COMPLETED"),
      admin.from("consignments").select("id", count).eq("shop_id", shopId).eq("status", "ACTIVE"),
    ]);
  if (!shop) notFound();

  const suspended = Boolean(shop.suspended_at);
  const revenue = (sales.data ?? []).reduce((sum, s) => sum + s.sale_price, 0);
  const tone = notice && notice in NOTICES ? NOTICES[notice as keyof typeof NOTICES] : null;
  const stats: [string, string][] = [
    [t("shopStats.inStock"), String(inStock.count ?? 0)],
    [t("shopStats.consigned"), String(consigned.count ?? 0)],
    [t("shopStats.sold"), String(sold.count ?? 0)],
    [t("shopStats.activeConsignments"), String(consignments.count ?? 0)],
    [t("shopStats.revenue"), formatMoney(revenue, shop.currency)],
  ];
  const contact = (phone?: string | null, email?: string | null) => (phone ? `+${phone}` : (email ?? ""));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <PageHeader
          title={shop.name}
          subtitle={t("created", { date: format.dateTime(new Date(shop.created_at), { dateStyle: "long" }) })}
        />
        <div className="-mt-3 flex flex-wrap gap-1.5">
          <Badge tone={suspended ? "danger" : "success"}>{t(suspended ? "suspended" : "active")}</Badge>
          {shop.phone ? <Badge>{shop.phone}</Badge> : null}
          {shop.address ? <Badge>{shop.address}</Badge> : null}
        </div>
      </div>

      {tone ? <FormMessage tone={tone}>{t(`notices.shop.${notice}`)}</FormMessage> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(([label, value], index) => (
          <div
            key={label}
            className={`rounded-3xl bg-surface p-4 shadow-card ${index === 4 ? "col-span-2 sm:col-span-1" : ""}`}
          >
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 text-lg font-extrabold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <section>
        <SectionTitle>{t("membersTitle", { count: members.data?.length ?? 0 })}</SectionTitle>
        <ul className="flex flex-col gap-3">
          {(members.data ?? []).map((m) => (
            <li key={m.id}>
              <Link
                href={`/admin/users/${m.users?.id}`}
                className={`flex items-center gap-3 rounded-3xl bg-surface p-4 shadow-card transition hover:-translate-y-0.5 ${focusRing}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{m.users?.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {contact(m.users?.phone, m.users?.email)}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge tone="primary">{roles(m.role)}</Badge>
                    {m.role === "DEALER" ? (
                      <Badge>{format.number(m.commission_rate_bps / 10000, { style: "percent", maximumFractionDigits: 2 })}</Badge>
                    ) : null}
                    {m.active ? null : <Badge tone="danger">{t("memberInactive")}</Badge>}
                  </span>
                </span>
                <span className="text-muted">{icons.chevron}</span>
              </Link>
            </li>
          ))}
          {(invitations.data ?? []).map((invitation) => (
            <li key={invitation.id} className="rounded-3xl bg-surface p-4 shadow-card">
              <p className="truncate font-semibold">{contact(invitation.phone, invitation.email)}</p>
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge tone="primary">{roles(invitation.role)}</Badge>
                <Badge tone="warning">{t("invited")}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Card className="flex flex-col gap-3">
        <p className="font-bold">{t(suspended ? "restoreShopTitle" : "suspendShopTitle")}</p>
        <p className="text-sm text-muted">{t(suspended ? "restoreShopHint" : "suspendShopHint")}</p>
        <form action={setShopSuspended.bind(null, shopId, !suspended)}>
          <ConfirmButton
            confirm={{
              message: t(suspended ? "confirmRestoreShop" : "confirmSuspendShop", { name: shop.name }),
              tone: suspended ? "primary" : "danger",
              confirmLabel: t(suspended ? "restoreShop" : "suspendShop"),
            }}
            variant={suspended ? "primary" : "danger"}
            className="w-full sm:w-auto"
          >
            {t(suspended ? "restoreShop" : "suspendShop")}
          </ConfirmButton>
        </form>
      </Card>
    </div>
  );
}
