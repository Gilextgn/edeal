import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge, Button, ButtonLink, Card, PageHeader } from "@/components/ui";
import { amountToInput, formatMoney, PERSONAL_CURRENCY } from "@/domain/money";
import { loadDevice } from "@/features/devices/device-detail";
import { Variant } from "@/features/devices/labels";
import { ReportCards } from "@/features/devices/report-cards";
import { requireWritable, type DeviceScope } from "@/features/devices/scope";
import type { MemberRole } from "@/lib/session";
import type { createClient } from "@/lib/supabase/server";
import { decideSale } from "./actions";
import { ConsignForm, ReturnForm, SellForm } from "./forms";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type DeviceContext = {
  supabase: Supabase;
  scope: DeviceScope;
  userId: string;
  deviceId: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const cardLink =
  "flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function customersOf(supabase: Supabase, shopId: string | null, userId: string) {
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

const consignmentTones = {
  ACTIVE: "primary",
  SOLD: "success",
  RETURNED: "neutral",
  SETTLED: "success",
} as const;

// Le patron voit tous les dépôts de la boutique ; le dealer, les siens.
export async function ConsignmentsList({ supabase, shop, role }: ShopContext) {
  if (role === "CASHIER") notFound();
  const t = await getTranslations("consignments");
  const format = await getFormatter();
  const isDealer = role === "DEALER";

  const { data } = await supabase
    .from("consignments")
    .select(
      "id, status, due_on, floor_price, device_id, devices(model, capacity, color, imei), users!consignments_dealer_user_id_fkey(name)",
    )
    .eq("shop_id", shop.id)
    .order("due_on");
  const consignments = [...(data ?? [])].sort(
    (a, b) => Number(b.status === "ACTIVE") - Number(a.status === "ACTIVE"),
  );

  return (
    <>
      <PageHeader
        title={t(isDealer ? "mineTitle" : "title")}
        subtitle={t(isDealer ? "mineSubtitle" : "subtitle")}
      />
      {consignments.length === 0 ? (
        <Card className="text-muted lg:max-w-xl">{t(isDealer ? "mineEmpty" : "empty")}</Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {consignments.map((c) => {
            const overdue = c.status === "ACTIVE" && c.due_on < today();
            return (
              <li key={c.id}>
                <Link
                  href={
                    isDealer
                      ? `/s/${shop.id}/consignments/${c.id}`
                      : `/s/${shop.id}/devices/${c.device_id}`
                  }
                  className={cardLink}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{c.devices?.model}</p>
                      {c.devices ? (
                        <p className="text-sm text-muted">
                          <Variant capacity={c.devices.capacity} color={c.devices.color} />
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={consignmentTones[c.status]}>{t(`status.${c.status}`)}</Badge>
                      {overdue ? <Badge tone="danger">{t("overdue")}</Badge> : null}
                    </div>
                  </div>
                  <dl className="mt-auto grid grid-cols-2 gap-2 text-sm">
                    {isDealer ? null : (
                      <div className="col-span-2">
                        <dt className="text-muted">{t("dealer")}</dt>
                        <dd className="font-medium">{c.users?.name}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-muted">{t("dueOn")}</dt>
                      <dd className="font-medium">
                        {format.dateTime(new Date(c.due_on), { dateStyle: "medium" })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">{t("floor")}</dt>
                      <dd className="font-medium">{formatMoney(c.floor_price, shop.currency)}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

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
            <p className="rounded-xl bg-warning-soft p-3 text-sm font-medium text-warning">
              {t("sales.awaitingOwner", { price: money(pendingSale.sale_price) })}
            </p>
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

// ---------- Ventes ----------

const saleTones = {
  PENDING_APPROVAL: "warning",
  COMPLETED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
} as const;

// Ventes d'une boutique (`shopId`) ou ventes perso de l'utilisateur.
// Dans une boutique, la base montre tout au patron et au caissier, et au
// dealer ses seules ventes.
export async function SalesList({
  supabase,
  shopId,
  role,
  userId,
  currency = PERSONAL_CURRENCY,
}: {
  supabase: Supabase;
  shopId: string | null;
  role: MemberRole | null;
  userId: string;
  currency?: string;
}) {
  const t = await getTranslations("sales");
  const format = await getFormatter();
  const money = (amount: number) => formatMoney(amount, currency);

  const query = supabase
    .from("sales")
    .select(
      "id, status, sale_price, shop_share, dealer_share, created_at, seller_user_id, consignment_id, devices(model, capacity, color), customers(name), consignments(floor_price), users!sales_seller_user_id_fkey(name)",
    )
    .order("created_at", { ascending: false });
  const { data } = await (shopId
    ? query.eq("shop_id", shopId)
    : query.eq("type", "PERSONAL").eq("seller_user_id", userId));
  const sales = [...(data ?? [])].sort(
    (a, b) =>
      Number(b.status === "PENDING_APPROVAL") - Number(a.status === "PENDING_APPROVAL"),
  );

  return (
    <>
      <PageHeader
        title={t(shopId ? (role === "DEALER" ? "mineTitle" : "title") : "personalTitle")}
        subtitle={t(shopId ? (role === "DEALER" ? "mineSubtitle" : "subtitle") : "personalSubtitle")}
      />
      {sales.length === 0 ? (
        <Card className="text-muted lg:max-w-xl">{t("empty")}</Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sales.map((sale) => (
            <li key={sale.id}>
              <Card className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{sale.devices?.model}</p>
                    {sale.devices ? (
                      <p className="text-sm text-muted">
                        <Variant capacity={sale.devices.capacity} color={sale.devices.color} />
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={saleTones[sale.status]}>{t(`status.${sale.status}`)}</Badge>
                </div>

                <p className="text-2xl font-bold tracking-tight">{money(sale.sale_price)}</p>

                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-muted">{t("customer")}</dt>
                    <dd className="truncate font-medium">{sale.customers?.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">{t("date")}</dt>
                    <dd className="font-medium">
                      {format.dateTime(new Date(sale.created_at), { dateStyle: "medium" })}
                    </dd>
                  </div>
                  {shopId && sale.users?.name && sale.seller_user_id !== userId ? (
                    <div className="col-span-2">
                      <dt className="text-muted">{t("seller")}</dt>
                      <dd className="font-medium">{sale.users.name}</dd>
                    </div>
                  ) : null}
                  {shopId && sale.shop_share !== null && sale.dealer_share !== null ? (
                    <>
                      <div>
                        <dt className="text-muted">{t("shopShare")}</dt>
                        <dd className="font-semibold">{money(sale.shop_share)}</dd>
                      </div>
                      {sale.consignment_id ? (
                        <div>
                          <dt className="text-muted">
                            {t(sale.seller_user_id === userId ? "yourShare" : "dealerShare")}
                          </dt>
                          <dd className="font-semibold">{money(sale.dealer_share)}</dd>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </dl>

                {sale.status === "PENDING_APPROVAL" && sale.consignments ? (
                  <p className="rounded-xl bg-warning-soft p-3 text-sm font-medium text-warning">
                    {t("belowFloorNote", { floor: money(sale.consignments.floor_price) })}
                  </p>
                ) : null}

                {sale.status === "PENDING_APPROVAL" && role === "OWNER" && shopId ? (
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <form action={decideSale.bind(null, shopId, sale.id, false)}>
                      <Button type="submit" variant="danger" className="w-full">
                        {t("reject")}
                      </Button>
                    </form>
                    <form action={decideSale.bind(null, shopId, sale.id, true)}>
                      <Button type="submit" className="w-full">
                        {t("approve")}
                      </Button>
                    </form>
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ---------- Clients ----------

export async function CustomersList({
  supabase,
  shopId,
  role,
  userId,
}: {
  supabase: Supabase;
  shopId: string | null;
  role: MemberRole | null;
  userId: string;
}) {
  const t = await getTranslations("customers");
  const { data: customers } = await customersOf(supabase, shopId, userId);
  const subtitle = !shopId
    ? "personalSubtitle"
    : role === "DEALER"
      ? "mineSubtitle"
      : "subtitle";

  return (
    <>
      <PageHeader title={t(shopId ? "title" : "personalTitle")} subtitle={t(subtitle)} />
      {!customers || customers.length === 0 ? (
        <Card className="text-muted lg:max-w-xl">{t("empty")}</Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => (
            <li key={customer.id}>
              <Card>
                <p className="truncate font-semibold">{customer.name}</p>
                <p className="text-sm text-muted">{customer.phone ?? t("noPhone")}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
