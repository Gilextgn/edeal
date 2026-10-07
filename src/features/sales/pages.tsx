import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Precache } from "@/components/offline";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";
import { amountToInput, formatMoney } from "@/domain/money";
import { loadDevice } from "@/features/devices/device-detail";
import { Variant } from "@/features/devices/labels";
import { ReportCards } from "@/features/devices/report-cards";
import { requireWritable, type DeviceScope } from "@/features/devices/scope";
import { ListingPage } from "@/features/share/pages";
import type { MemberRole } from "@/lib/session";
import type { createClient } from "@/lib/supabase/server";
import { ConsignForm, ReturnForm, SellForm } from "./forms";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type DeviceContext = {
  supabase: Supabase;
  scope: DeviceScope;
  userId: string;
  deviceId: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export function customersOf(supabase: Supabase, shopId: string | null, userId: string) {
  // La base ne renvoie que les clients visibles par l'utilisateur ; le filtre
  // désigne l'espace (boutique ou perso) dans lequel on se trouve.
  const query = supabase.from("customers").select("id, name, phone, created_at").order("name");
  return shopId ? query.eq("shop_id", shopId) : query.eq("owner_user_id", userId);
}

// ---------- Écrans partant d'un appareil (patron, caissier, espace perso) ----------

export async function ConsignPage({ supabase, scope, userId, deviceId }: DeviceContext) {
  requireWritable(scope);
  const device = await loadDevice(supabase, scope, userId, deviceId);
  if (!scope.shopId || device.status !== "IN_STOCK") notFound();
  const t = await getTranslations("consignments");
  const format = await getFormatter();

  const { data: dealers } = await supabase
    .from("memberships")
    .select("id, commission_rate_bps, users(name)")
    .eq("shop_id", scope.shopId)
    .eq("role", "DEALER")
    .eq("active", true);

  return (
    <div className="lg:max-w-3xl">
      <PageHeader
        title={t("consignTitle")}
        subtitle={t("deviceLine", { model: device.model, imei: device.imei })}
      />
      <ConsignForm
        deviceId={device.id}
        userId={userId}
        backHref={`${scope.basePath}/${device.id}`}
        membersHref={`/s/${scope.shopId}/members/new`}
        currency={scope.currency}
        defaultFloor={amountToInput(device.target_price, scope.currency)}
        dealers={(dealers ?? []).map((d) => ({
          membershipId: d.id,
          name: d.users?.name ?? "",
          rate: format.number(d.commission_rate_bps / 10000, {
            style: "percent",
            maximumFractionDigits: 2,
          }),
        }))}
      />
    </div>
  );
}

export async function ReturnPage({ supabase, scope, userId, deviceId }: DeviceContext) {
  requireWritable(scope);
  const device = await loadDevice(supabase, scope, userId, deviceId);
  const t = await getTranslations("consignments");

  const { data: consignment } = await supabase
    .from("consignments")
    .select("id")
    .eq("device_id", device.id)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (!consignment) notFound();

  return (
    <div className="lg:max-w-3xl">
      <PageHeader
        title={t("returnTitle")}
        subtitle={t("deviceLine", { model: device.model, imei: device.imei })}
      />
      <ReturnForm
        deviceId={device.id}
        userId={userId}
        backHref={`${scope.basePath}/${device.id}`}
        consignmentId={consignment.id}
      />
    </div>
  );
}

// Vente d'un appareil en stock : vente directe de la boutique, ou vente perso.
export async function SellDevicePage({ supabase, scope, userId, deviceId }: DeviceContext) {
  const device = await loadDevice(supabase, scope, userId, deviceId);
  if (!scope.canSell || device.status !== "IN_STOCK") notFound();
  const t = await getTranslations("sales");
  const { data: customers } = await customersOf(supabase, scope.shopId, userId);

  return (
    <div className="lg:max-w-3xl">
      <PageHeader
        title={t("sellTitle")}
        subtitle={t("deviceLine", { model: device.model, imei: device.imei })}
      />
      <SellForm
        deviceId={device.id}
        userId={userId}
        backHref={`${scope.basePath}/${device.id}`}
        doneHref={`${scope.basePath}/${device.id}`}
        kind={scope.shopId ? "DIRECT" : "PERSONAL"}
        currency={scope.currency}
        purchasePrice={device.purchase_price}
        rateBps={0}
        floorPrice={null}
        defaultPrice={amountToInput(device.target_price, scope.currency)}
        customers={customers ?? []}
      />
    </div>
  );
}

// ---------- Dépôts ----------

type ShopContext = {
  supabase: Supabase;
  shop: { id: string; currency: string };
  role: MemberRole;
  userId: string;
};

export const consignmentTones = {
  ACTIVE: "primary",
  SOLD: "success",
  RETURNED: "neutral",
  SETTLED: "success",
} as const;

async function loadMyConsignment({ supabase, shop, role, userId }: ShopContext, id: string) {
  if (role !== "DEALER" || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: consignment } = await supabase
    .from("consignments")
    .select("*, devices(*)")
    .eq("id", id)
    .eq("shop_id", shop.id)
    .eq("dealer_user_id", userId)
    .maybeSingle();
  if (!consignment?.devices) notFound();

  const { data: pendingSale } = await supabase
    .from("sales")
    .select("id, sale_price")
    .eq("consignment_id", consignment.id)
    .eq("status", "PENDING_APPROVAL")
    .maybeSingle();

  return { consignment, device: consignment.devices, pendingSale };
}

// Fiche d'un dépôt, vue par le dealer à qui l'appareil est confié.
export async function DealerConsignmentPage(context: ShopContext & { consignmentId: string }) {
  const { consignment, device, pendingSale } = await loadMyConsignment(
    context,
    context.consignmentId,
  );
  const { supabase, shop } = context;
  const t = await getTranslations();
  const format = await getFormatter();
  const money = (amount: number) => formatMoney(amount, shop.currency);
  const active = consignment.status === "ACTIVE";
  const overdue = active && consignment.due_on < today();

  return (
    <>
      <PageHeader
        title={device.model}
        subtitle={`${t("devices.imei")} ${device.imei}`}
        action={
          active && !pendingSale ? (
            <ButtonLink
              href={`/s/${shop.id}/consignments/${consignment.id}/sell`}
              className="w-full sm:w-auto"
            >
              {t("sales.sell")}
            </ButtonLink>
          ) : null
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="flex flex-col gap-4 lg:sticky lg:top-9">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">
              <Variant capacity={device.capacity} color={device.color} />
            </p>
            <div className="flex flex-col items-end gap-1">
              <Badge tone={consignmentTones[consignment.status]}>
                {t(`consignments.status.${consignment.status}`)}
              </Badge>
              {overdue ? <Badge tone="danger">{t("consignments.overdue")}</Badge> : null}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">{t("devices.targetPriceLabel")}</dt>
              <dd className="font-semibold">{money(device.target_price)}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("consignments.floor")}</dt>
              <dd className="font-semibold">{money(consignment.floor_price)}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("devices.purchasePriceLabel")}</dt>
              <dd className="font-semibold">{money(device.purchase_price)}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("consignments.dueOn")}</dt>
              <dd className="font-semibold">
                {format.dateTime(new Date(consignment.due_on), { dateStyle: "long" })}
              </dd>
            </div>
          </dl>
          {pendingSale ? (
            <p className="rounded-2xl bg-warning-soft p-3 text-sm font-medium text-warning">
              {t("sales.awaitingOwner", { price: money(pendingSale.sale_price) })}
            </p>
          ) : null}
          {active ? (
            <ButtonLink
              href={`/s/${shop.id}/consignments/${consignment.id}/listing`}
              variant="secondary"
            >
              {t("listing.open")}
            </ButtonLink>
          ) : null}
          {active && !pendingSale ? (
            <Precache urls={[`/s/${shop.id}/consignments/${consignment.id}/sell`]} />
          ) : null}
        </Card>

        <ReportCards supabase={supabase} deviceId={device.id} />
      </div>
    </>
  );
}

export async function DealerSellPage(
  context: ShopContext & { consignmentId: string; rateBps: number },
) {
  const { consignment, device, pendingSale } = await loadMyConsignment(
    context,
    context.consignmentId,
  );
  if (consignment.status !== "ACTIVE" || pendingSale) notFound();
  const { supabase, shop, userId } = context;
  const t = await getTranslations("sales");
  const { data: customers } = await customersOf(supabase, shop.id, userId);

  return (
    <div className="lg:max-w-3xl">
      <PageHeader
        title={t("sellTitle")}
        subtitle={t("deviceLine", { model: device.model, imei: device.imei })}
      />
      <SellForm
        deviceId={device.id}
        userId={userId}
        backHref={`/s/${shop.id}/consignments/${consignment.id}`}
        doneHref={`/s/${shop.id}/sales`}
        kind="CONSIGNMENT"
        currency={shop.currency}
        purchasePrice={device.purchase_price}
        rateBps={context.rateBps}
        floorPrice={consignment.floor_price}
        defaultPrice={amountToInput(device.target_price, shop.currency)}
        customers={customers ?? []}
      />
    </div>
  );
}

// Annonce d'un appareil confié, pour le dealer qui le vend.
export async function DealerListingPage(
  context: ShopContext & { consignmentId: string; contactPhone: string | null },
) {
  const { consignment, device } = await loadMyConsignment(context, context.consignmentId);
  return (
    <ListingPage
      supabase={context.supabase}
      device={device}
      currency={context.shop.currency}
      contactPhone={context.contactPhone}
      backHref={`/s/${context.shop.id}/consignments/${consignment.id}`}
    />
  );
}
