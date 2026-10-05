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
  const seesStock = role === "OWNER" || role === "CASHIER";

  // Chaque requête ne renvoie que ce que le rôle a le droit de voir.
  const [stock, members, invitations] = await Promise.all([
    seesStock
      ? supabase
          .from("devices")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shop.id)
          .eq("status", "IN_STOCK")
      : null,
    role === "OWNER"
      ? supabase.from("memberships").select("role").eq("shop_id", shop.id).eq("active", true)
      : null,
    role === "OWNER"
      ? supabase
          .from("invitations")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shop.id)
      : null,
  ]);

  return (
    <>
      <PageHeader
        title={shop.name}
        subtitle={t("shop.homeSubtitle")}
        action={
          seesStock ? (
            <ButtonLink href={`/s/${shop.id}/devices`} className="w-full sm:w-auto">
              {t("shop.viewStock")}
            </ButtonLink>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stock ? <Stat label={t("shop.inStock")} value={stock.count ?? 0} /> : null}
        {members ? (
          <>
            <Stat label={t("shop.members")} value={members.data?.length ?? 0} />
            <Stat
              label={t("shop.dealers")}
              value={members.data?.filter((m) => m.role === "DEALER").length ?? 0}
            />
          </>
        ) : (
          <Stat label={t("shop.myRole")} value={t(`roles.${role}`)} />
        )}
        {invitations ? (
          <Stat label={t("shop.invitations")} value={invitations.count ?? 0} />
        ) : null}
        {role === "DEALER" ? (
          <Stat
            label={t("shop.myRate")}
            value={format.number(membership.commission_rate_bps / 10000, {
              style: "percent",
              maximumFractionDigits: 2,
            })}
          />
        ) : null}
      </div>

      <Card className="mt-4 text-muted lg:max-w-xl">{t("shop.comingSoon")}</Card>
    </>
  );
}
