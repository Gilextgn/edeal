import { getFormatter, getTranslations } from "next-intl/server";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { requireShop } from "@/lib/session";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
    </Card>
  );
}

export default async function ShopHomePage({ params }: PageProps<"/s/[shopId]">) {
  const { shopId } = await params;
  const { supabase, shop, membership } = await requireShop(shopId);
  const t = await getTranslations();
  const format = await getFormatter();
  const { role } = membership;
  const base = `/s/${shop.id}`;
  const count = { count: "exact", head: true } as const;

  // Chaque requête ne renvoie que ce que le rôle a le droit de voir :
  // pour un dealer, « dépôts en cours » ne compte que les siens.
  const [stock, consignments, pendingSales, members, invitations] = await Promise.all([
    role === "DEALER"
      ? null
      : supabase
          .from("devices")
          .select("id", count)
          .eq("shop_id", shop.id)
          .eq("status", "IN_STOCK"),
    role === "CASHIER"
      ? null
      : supabase
          .from("consignments")
          .select("id", count)
          .eq("shop_id", shop.id)
          .eq("status", "ACTIVE"),
    supabase
      .from("sales")
      .select("id", count)
      .eq("shop_id", shop.id)
      .eq("status", "PENDING_APPROVAL"),
    role === "OWNER"
      ? supabase.from("memberships").select("role").eq("shop_id", shop.id).eq("active", true)
      : null,
    role === "OWNER"
      ? supabase.from("invitations").select("id", count).eq("shop_id", shop.id)
      : null,
  ]);
  const toReview = pendingSales.count ?? 0;

  return (
    <>
      <PageHeader
        title={shop.name}
        subtitle={t("shop.homeSubtitle")}
        action={
          role === "OWNER" && toReview > 0 ? (
            <ButtonLink href={`${base}/sales`} className="w-full sm:w-auto">
              {t("shop.reviewSales")}
            </ButtonLink>
          ) : role === "DEALER" ? (
            <ButtonLink href={`${base}/consignments`} className="w-full sm:w-auto">
              {t("consignments.mineTitle")}
            </ButtonLink>
          ) : (
            <ButtonLink href={`${base}/devices`} className="w-full sm:w-auto">
              {t("shop.viewStock")}
            </ButtonLink>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stock ? <Stat label={t("shop.inStock")} value={stock.count ?? 0} /> : null}
        {consignments ? (
          <Stat
            label={t(role === "DEALER" ? "shop.myConsignments" : "shop.activeConsignments")}
            value={consignments.count ?? 0}
          />
        ) : null}
        <Stat label={t("shop.pendingSales")} value={toReview} />
        {role === "DEALER" ? (
          <Stat
            label={t("shop.myRate")}
            value={format.number(membership.commission_rate_bps / 10000, {
              style: "percent",
              maximumFractionDigits: 2,
            })}
          />
        ) : null}
        {members ? (
          <Stat
            label={t("shop.dealers")}
            value={members.data?.filter((m) => m.role === "DEALER").length ?? 0}
          />
        ) : null}
        {invitations ? (
          <Stat label={t("shop.invitations")} value={invitations.count ?? 0} />
        ) : null}
      </div>

      <Card className="mt-4 text-muted lg:max-w-xl">{t("shop.comingSoon")}</Card>
    </>
  );
}
