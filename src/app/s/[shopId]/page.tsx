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
  const isPatron = membership.role === "PATRON";

  return (
    <>
      <PageHeader
        title={shop.name}
        subtitle={t("shop.homeSubtitle")}
        action={
          isPatron ? (
            <ButtonLink href={`/s/${shop.id}/members`} className="w-full sm:w-auto">
              {t("shop.manageMembers")}
            </ButtonLink>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isPatron ? (
          <PatronStats supabase={supabase} shopId={shop.id} />
        ) : (
          <>
            <Stat label={t("shop.myRole")} value={t(`roles.${membership.role}`)} />
            {membership.role === "DEALER" ? (
              <Stat
                label={t("shop.myRate")}
                value={format.number(membership.commission_rate_bps / 10000, {
                  style: "percent",
                  maximumFractionDigits: 2,
                })}
              />
            ) : null}
          </>
        )}
        <Stat label={t("shop.currency")} value={shop.currency} />
      </div>

      <Card className="mt-4 text-muted">{t("shop.comingSoon")}</Card>
    </>
  );
}

async function PatronStats({
  supabase,
  shopId,
}: {
  supabase: Awaited<ReturnType<typeof requireShop>>["supabase"];
  shopId: string;
}) {
  const t = await getTranslations("shop");
  const [{ data: members }, { count: invitations }] = await Promise.all([
    supabase
      .from("memberships")
      .select("role")
      .eq("shop_id", shopId)
      .eq("active", true),
    supabase
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId),
  ]);

  return (
    <>
      <Stat label={t("members")} value={members?.length ?? 0} />
      <Stat
        label={t("dealers")}
        value={members?.filter((m) => m.role === "DEALER").length ?? 0}
      />
      <Stat label={t("invitations")} value={invitations ?? 0} />
    </>
  );
}
