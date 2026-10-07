import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { icons } from "@/components/icons";
import { Badge, Button, ButtonLink, Card, FormMessage, PageHeader } from "@/components/ui";
import { isOverdue, outstanding } from "@/domain/installments";
import { formatMoney, PERSONAL_CURRENCY } from "@/domain/money";
import { Variant } from "@/features/devices/labels";
import type { MemberRole } from "@/lib/session";
import type { createClient } from "@/lib/supabase/server";
import { recordSettlement, setInstallmentPaid, setInstallments } from "./actions";
import { InstallmentForm, SettlementForm } from "./forms";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const UUID = /^[0-9a-f-]{36}$/i;
const today = () => new Date().toISOString().slice(0, 10);

const saleTones = {
  PENDING_APPROVAL: "warning",
  COMPLETED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
} as const;

// ---------- Fiche d'une vente : parts, échéances du client ----------

export async function SaleDetail({
  supabase,
  shopId,
  userId,
  saleId,
  currency = PERSONAL_CURRENCY,
}: {
  supabase: Supabase;
  // Vide dans l'espace perso.
  shopId: string | null;
  userId: string;
  saleId: string;
  currency?: string;
}) {
  if (!UUID.test(saleId)) notFound();
  const { data: sale } = await supabase
    .from("sales")
    .select(
      "*, devices(model, capacity, color, imei), customers(name, phone), installments(id, amount, due_on, paid_on)",
    )
    .eq("id", saleId)
    .maybeSingle();

  // La base ne renvoie que les ventes visibles ; on vérifie en plus l'espace.
  const inSpace = shopId
    ? sale?.shop_id === shopId
    : sale?.type === "PERSONAL" && sale.seller_user_id === userId;
  if (!sale || !inSpace) notFound();

  const t = await getTranslations();
  const format = await getFormatter();
  const money = (amount: number) => formatMoney(amount, currency);
  const day = (date: string) => format.dateTime(new Date(date), { dateStyle: "long" });

  const installments = [...sale.installments].sort((a, b) => a.due_on.localeCompare(b.due_on));
  const completed = sale.status === "COMPLETED";

  return (
    <>
      <PageHeader
        title={sale.devices?.model ?? t("sales.sale")}
        subtitle={sale.devices ? `${t("devices.imei")} ${sale.devices.imei}` : undefined}
        action={
          completed ? (
            <ButtonLink
              href={`${shopId ? `/s/${shopId}` : "/perso"}/sales/${sale.id}/receipt`}
              className="w-full sm:w-auto"
            >
              {t("receipt.open")}
            </ButtonLink>
          ) : null
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl font-bold tracking-tight">{money(sale.sale_price)}</p>
            <Badge tone={saleTones[sale.status]}>{t(`sales.status.${sale.status}`)}</Badge>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {sale.devices ? (
              <div className="col-span-2">
                <dt className="text-muted">{t("devices.model")}</dt>
                <dd className="font-medium">
                  {sale.devices.model} ·{" "}
                  <Variant capacity={sale.devices.capacity} color={sale.devices.color} />
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted">{t("sales.customer")}</dt>
              <dd className="font-medium">{sale.customers?.name}</dd>
              {sale.customers?.phone ? (
                <dd className="text-muted">{sale.customers.phone}</dd>
              ) : null}
            </div>
            <div>
              <dt className="text-muted">{t("sales.date")}</dt>
              <dd className="font-medium">{day(sale.created_at)}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("sales.warranty")}</dt>
              <dd className="font-medium">
                {sale.warranty_days === 0
                  ? t("sales.noWarranty")
                  : t("sales.warrantyDays", { count: sale.warranty_days })}
              </dd>
            </div>
            {shopId && sale.shop_share !== null && sale.dealer_share !== null ? (
              <>
                <div>
                  <dt className="text-muted">{t("sales.shopShare")}</dt>
                  <dd className="font-semibold">{money(sale.shop_share)}</dd>
                </div>
                {sale.consignment_id ? (
                  <div>
                    <dt className="text-muted">
                      {t(sale.seller_user_id === userId ? "sales.yourShare" : "sales.dealerShare")}
                    </dt>
                    <dd className="font-semibold">{money(sale.dealer_share)}</dd>
                  </div>
                ) : null}
              </>
            ) : null}
          </dl>
        </Card>

        {completed ? (
          <Card className="flex flex-col gap-4">
            <div>
              <h2 className="font-semibold">{t("money.customerPayment")}</h2>
              <p className="text-sm text-muted">
                {installments.length === 0
                  ? t("money.paidInFull")
                  : t("money.leftToPay", { amount: money(outstanding(installments)) })}
              </p>
            </div>

            {installments.length === 0 ? (
              <details className="group">
                <summary className="inline-flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-2xl border border-border bg-surface px-5 font-semibold hover:bg-surface-2">
                  {icons.plus}
                  {t("money.payInInstallments")}
                </summary>
                <div className="mt-4">
                  <InstallmentForm
                    action={setInstallments.bind(null, shopId, sale.id)}
                    total={sale.sale_price}
                    currency={currency}
                    today={today()}
                  />
                </div>
              </details>
            ) : (
              <ul className="flex flex-col gap-2">
                {installments.map((installment) => {
                  const paid = installment.paid_on !== null;
                  const late = isOverdue(installment.due_on, installment.paid_on, today());
                  return (
                    <li
                      key={installment.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-3"
                    >
                      <div>
                        <p className="font-semibold">{money(installment.amount)}</p>
                        <p className="text-sm text-muted">
                          {paid
                            ? t("money.paidOn", { date: day(installment.paid_on!) })
                            : t("money.dueOn", { date: day(installment.due_on) })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {paid ? (
                          <Badge tone="success">{t("money.paid")}</Badge>
                        ) : late ? (
                          <Badge tone="danger">{t("money.late")}</Badge>
                        ) : (
                          <Badge>{t("money.upcoming")}</Badge>
                        )}
                        <form action={setInstallmentPaid.bind(null, shopId, installment.id, !paid)}>
                          <Button type="submit" variant="secondary" className="min-h-11 px-3 text-sm">
                            {t(paid ? "money.markUnpaid" : "money.markPaid")}
                          </Button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ) : null}
      </div>
    </>
  );
}

// ---------- Soldes des dealers ----------

type Balance = {
  membership_id: string;
  dealer_name: string;
  active: boolean;
  total_owed: number;
  total_settled: number;
  balance: number;
};

type ShopContext = {
  supabase: Supabase;
  shop: { id: string; currency: string };
  role: MemberRole;
};

async function loadBalances(supabase: Supabase, shopId: string) {
  const { data } = await supabase.rpc("dealer_balances", { p_shop_id: shopId });
  return (data ?? []) as Balance[];
}

// Patron et caissier : la liste des dealers et ce que chacun doit.
// Dealer : directement son propre solde.
export async function BalancesList({
  supabase,
  shop,
  role,
  settled,
}: ShopContext & { settled: boolean }) {
  const balances = await loadBalances(supabase, shop.id);
  if (role === "DEALER") {
    if (balances.length === 0) notFound();
    return (
      <BalanceDetail
        supabase={supabase}
        shop={shop}
        role={role}
        membershipId={balances[0].membership_id}
        settled={settled}
      />
    );
  }

  const t = await getTranslations("money");
  const money = (amount: number) => formatMoney(amount, shop.currency);
  const total = balances.reduce((sum, b) => sum + b.balance, 0);

  return (
    <>
      <PageHeader title={t("balancesTitle")} subtitle={t("balancesSubtitle")} />
      <Card className="mb-4 lg:max-w-sm">
        <p className="text-sm text-muted">{t("totalOwed")}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{money(total)}</p>
      </Card>
      {balances.length === 0 ? (
        <Card className="text-muted lg:max-w-xl">{t("noDealers")}</Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {balances.map((b) => (
            <li key={b.membership_id}>
              <Link
                href={`/s/${shop.id}/balances/${b.membership_id}`}
                className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate font-semibold">{b.dealer_name}</p>
                  {b.balance === 0 ? (
                    <Badge tone="success">{t("upToDate")}</Badge>
                  ) : (
                    <Badge tone="warning">{t("owes")}</Badge>
                  )}
                </div>
                <p className="text-2xl font-bold tracking-tight">{money(b.balance)}</p>
                <p className="text-sm text-muted">
                  {t("settledOf", { settled: money(b.total_settled), owed: money(b.total_owed) })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export async function BalanceDetail({
  supabase,
  shop,
  role,
  membershipId,
  settled,
}: ShopContext & { membershipId: string; settled: boolean }) {
  if (!UUID.test(membershipId)) notFound();
  const balance = (await loadBalances(supabase, shop.id)).find(
    (b) => b.membership_id === membershipId,
  );
  if (!balance) notFound();

  const t = await getTranslations("money");
  const format = await getFormatter();
  const money = (amount: number) => formatMoney(amount, shop.currency);
  const isDealer = role === "DEALER";

  const [{ data: dues }, { data: settlements }] = await Promise.all([
    supabase
      .from("sale_dues")
      .select("sale_id, due, shop_share, sold_at, device_id")
      .eq("membership_id", membershipId)
      .order("sold_at"),
    supabase
      .from("settlements")
      .select("id, amount, method, paid_at")
      .eq("membership_id", membershipId)
      .order("paid_at", { ascending: false }),
  ]);
  const deviceIds = (dues ?? []).map((d) => d.device_id!).filter(Boolean);
  const { data: devices } = deviceIds.length
    ? await supabase.from("devices").select("id, model").in("id", deviceIds)
    : { data: [] };
  const modelOf = new Map((devices ?? []).map((d) => [d.id, d.model]));

  const unpaid = (dues ?? [])
    .filter((d) => (d.due ?? 0) > 0)
    .map((d) => ({ saleId: d.sale_id!, due: d.due!, soldAt: d.sold_at!, deviceId: d.device_id! }));
  const labels = Object.fromEntries(
    unpaid.map((d) => [
      d.saleId,
      `${modelOf.get(d.deviceId) ?? ""} · ${format.dateTime(new Date(d.soldAt), { dateStyle: "medium" })}`,
    ]),
  );

  return (
    <>
      <PageHeader
        title={isDealer ? t("myBalanceTitle") : balance.dealer_name}
        subtitle={t(isDealer ? "myBalanceSubtitle" : "balanceSubtitle")}
      />

      {settled ? (
        <div className="mb-4">
          <FormMessage tone="success">{t("settlementSaved")}</FormMessage>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="col-span-2">
          <p className="text-sm text-muted">{t(isDealer ? "youOwe" : "balance")}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{money(balance.balance)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">{t("totalShopShares")}</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{money(balance.total_owed)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">{t("alreadySettled")}</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{money(balance.total_settled)}</p>
        </Card>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold">
            {t(isDealer ? "unpaidSales" : "newSettlement")}
          </h2>
          {unpaid.length === 0 ? (
            <p className="text-muted">{t("nothingDue")}</p>
          ) : isDealer ? (
            <ul className="flex flex-col gap-2">
              {unpaid.map((d) => (
                <li
                  key={d.saleId}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3"
                >
                  <span className="min-w-0 truncate font-medium">{labels[d.saleId]}</span>
                  <span className="shrink-0 font-semibold">{money(d.due)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <SettlementForm
              key={balance.balance}
              action={recordSettlement.bind(null, shop.id, membershipId)}
              dues={unpaid}
              labels={labels}
              currency={shop.currency}
            />
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold">{t("history")}</h2>
          {!settlements || settlements.length === 0 ? (
            <p className="text-muted">{t("noSettlements")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {settlements.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3"
                >
                  <div>
                    <p className="font-semibold">{money(s.amount)}</p>
                    <p className="text-sm text-muted">
                      {format.dateTime(new Date(s.paid_at), {
                        dateStyle: "long",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <Badge>{t(`methods.${s.method}`)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
