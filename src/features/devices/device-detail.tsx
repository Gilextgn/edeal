import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { icons } from "@/components/icons";
import { Badge, Button, ButtonLink, Card, FormMessage, PageHeader } from "@/components/ui";
import { formatMoney } from "@/domain/money";
import type { createClient } from "@/lib/supabase/server";
import { setDeviceWithdrawn } from "./actions";
import { StatusBadge, Variant } from "./labels";
import { ReportCards } from "./report-cards";
import type { DeviceScope } from "./scope";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Appareil de l'espace affiché, ou 404. La base ne renvoie que ce que
// l'utilisateur a le droit de voir ; on vérifie en plus qu'il s'agit du bon espace.
export async function loadDevice(
  supabase: Supabase,
  scope: DeviceScope,
  userId: string,
  deviceId: string,
) {
  if (!/^[0-9a-f-]{36}$/i.test(deviceId)) notFound();
  const { data: device } = await supabase
    .from("devices")
    .select("*")
    .eq("id", deviceId)
    .maybeSingle();

  const inScope = scope.shopId
    ? device?.shop_id === scope.shopId
    : device?.owner_user_id === userId;
  if (!device || !inScope) notFound();
  return device;
}

type Props = {
  supabase: Supabase;
  scope: DeviceScope;
  userId: string;
  deviceId: string;
  justCreated: boolean;
};

export async function DeviceDetail({ supabase, scope, userId, deviceId, justCreated }: Props) {
  const device = await loadDevice(supabase, scope, userId, deviceId);
  const t = await getTranslations();
  const format = await getFormatter();
  const money = (amount: number) => formatMoney(amount, scope.currency);
  const day = (date: string) => format.dateTime(new Date(date), { dateStyle: "long" });

  const [{ data: consignment }, { data: sale }] = await Promise.all([
    supabase
      .from("consignments")
      .select("id, due_on, floor_price, users!consignments_dealer_user_id_fkey(name)")
      .eq("device_id", device.id)
      .eq("status", "ACTIVE")
      .maybeSingle(),
    supabase
      .from("sales")
      .select("status, sale_price, shop_share, dealer_share, created_at, customers(name)")
      .eq("device_id", device.id)
      .in("status", ["PENDING_APPROVAL", "COMPLETED"])
      .maybeSingle(),
  ]);

  const base = `${scope.basePath}/${device.id}`;
  const inStock = device.status === "IN_STOCK";
  const canChangeStock = scope.canWrite && (inStock || device.status === "WITHDRAWN");
  const overdue = consignment ? consignment.due_on < new Date().toISOString().slice(0, 10) : false;

  return (
    <>
      <PageHeader
        title={device.model}
        subtitle={`${t("devices.imei")} ${device.imei}`}
        action={
          inStock && scope.canSell ? (
            <ButtonLink href={`${base}/sell`} className="w-full sm:w-auto">
              {t("sales.sell")}
            </ButtonLink>
          ) : null
        }
      />

      {justCreated ? (
        <div className="mb-4">
          <FormMessage tone="success">{t("devices.created")}</FormMessage>
        </div>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4 lg:sticky lg:top-9">
          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">
                <Variant capacity={device.capacity} color={device.color} />
              </p>
              <StatusBadge status={device.status} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">{t("devices.purchasePriceLabel")}</dt>
                <dd className="font-semibold">{money(device.purchase_price)}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("devices.targetPriceLabel")}</dt>
                <dd className="font-semibold">{money(device.target_price)}</dd>
              </div>
            </dl>
            <p className="text-sm text-muted">
              {t("devices.addedOn", { date: day(device.created_at) })}
            </p>
            {scope.canWrite ? (
              <div className="flex flex-col gap-2">
                {inStock && scope.shopId ? (
                  <ButtonLink href={`${base}/consign`}>{t("consignments.consign")}</ButtonLink>
                ) : null}
                <ButtonLink href={`${base}/reports/new`} variant="secondary">
                  {icons.plus}
                  {t("reports.add")}
                </ButtonLink>
                <ButtonLink href={`${base}/edit`} variant="secondary">
                  {t("devices.edit")}
                </ButtonLink>
                {canChangeStock ? (
                  <form action={setDeviceWithdrawn.bind(null, scope.shopId, device.id, inStock)}>
                    <Button
                      type="submit"
                      variant={inStock ? "danger" : "secondary"}
                      className="w-full"
                    >
                      {t(inStock ? "devices.withdraw" : "devices.restore")}
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </Card>

          {consignment ? (
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{t("consignments.current")}</p>
                {overdue ? <Badge tone="danger">{t("consignments.overdue")}</Badge> : null}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2">
                  <dt className="text-muted">{t("consignments.dealer")}</dt>
                  <dd className="font-semibold">{consignment.users?.name}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t("consignments.dueOn")}</dt>
                  <dd className="font-semibold">{day(consignment.due_on)}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t("consignments.floor")}</dt>
                  <dd className="font-semibold">{money(consignment.floor_price)}</dd>
                </div>
              </dl>
              {scope.canWrite && sale?.status !== "PENDING_APPROVAL" ? (
                <ButtonLink href={`${base}/return`} variant="secondary">
                  {t("consignments.recordReturn")}
                </ButtonLink>
              ) : null}
            </Card>
          ) : null}

          {sale ? (
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{t("sales.sale")}</p>
                <Badge tone={sale.status === "COMPLETED" ? "success" : "warning"}>
                  {t(`sales.status.${sale.status}`)}
                </Badge>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">{t("sales.priceLabel")}</dt>
                  <dd className="font-semibold">{money(sale.sale_price)}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t("sales.customer")}</dt>
                  <dd className="font-semibold">{sale.customers?.name}</dd>
                </div>
                {sale.shop_share !== null && scope.shopId ? (
                  <>
                    <div>
                      <dt className="text-muted">{t("sales.shopShare")}</dt>
                      <dd className="font-semibold">{money(sale.shop_share)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">{t("sales.dealerShare")}</dt>
                      <dd className="font-semibold">{money(sale.dealer_share ?? 0)}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </Card>
          ) : null}
        </div>

        <ReportCards supabase={supabase} deviceId={device.id} />
      </div>
    </>
  );
}
