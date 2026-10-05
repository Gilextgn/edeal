import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ListPagination } from "@/components/list";
import {
  ActionLink,
  Badge,
  Button,
  Card,
  PageHeader,
  RowActions,
  TableCard,
  Td,
  Th,
} from "@/components/ui";
import { formatMoney, PERSONAL_CURRENCY } from "@/domain/money";
import { pageRange } from "@/domain/pagination";
import { Variant } from "@/features/devices/labels";
import type { MemberRole } from "@/lib/session";
import type { createClient } from "@/lib/supabase/server";
import { decideSale } from "./actions";
import { consignmentTones } from "./pages";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const today = () => new Date().toISOString().slice(0, 10);

const saleTones = {
  PENDING_APPROVAL: "warning",
  COMPLETED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
} as const;

function DeviceCell({
  device,
}: {
  device: { model: string; capacity: string; color: string } | null;
}) {
  if (!device) return null;
  return (
    <>
      <p className="font-semibold">{device.model}</p>
      <p className="text-muted">
        <Variant capacity={device.capacity} color={device.color} />
      </p>
    </>
  );
}

// ---------- Ventes ----------
// Ventes d'une boutique (`shopId`) ou ventes perso de l'utilisateur. Dans une
// boutique, la base montre tout au patron et au caissier, et au dealer ses
// seules ventes. Les ventes à valider viennent en premier.

export async function SalesList({
  supabase,
  shopId,
  role,
  userId,
  page,
  currency = PERSONAL_CURRENCY,
}: {
  supabase: Supabase;
  shopId: string | null;
  role: MemberRole | null;
  userId: string;
  page: number;
  currency?: string;
}) {
  const t = await getTranslations();
  const format = await getFormatter();
  const money = (amount: number) => formatMoney(amount, currency);
  const { from, to } = pageRange(page);
  const path = shopId ? `/s/${shopId}/sales` : "/perso/sales";
  const isDealer = role === "DEALER";

  const query = supabase
    .from("sales")
    .select(
      "id, status, sale_price, shop_share, dealer_share, created_at, seller_user_id, consignment_id, devices(model, capacity, color), customers(name), consignments(floor_price), users!sales_seller_user_id_fkey(name)",
      { count: "exact" },
    )
    .order("status")
    .order("created_at", { ascending: false })
    .range(from, to);
  const { data: sales, count } = await (shopId
    ? query.eq("shop_id", shopId)
    : query.eq("type", "PERSONAL").eq("seller_user_id", userId));

  return (
    <>
      <PageHeader
        title={t(shopId ? (isDealer ? "sales.mineTitle" : "sales.title") : "sales.personalTitle")}
        subtitle={t(
          shopId ? (isDealer ? "sales.mineSubtitle" : "sales.subtitle") : "sales.personalSubtitle",
        )}
      />
      {!sales || sales.length === 0 ? (
        <Card className="text-muted lg:max-w-xl">{t("sales.empty")}</Card>
      ) : (
        <TableCard>
          <thead>
            <tr>
              <Th>{t("devices.device")}</Th>
              <Th className="hidden md:table-cell">{t("sales.customer")}</Th>
              <Th className="text-right">{t("sales.priceLabel")}</Th>
              {shopId ? (
                <Th className="hidden text-right lg:table-cell">
                  {t(isDealer ? "sales.yourShare" : "sales.shopShare")}
                </Th>
              ) : null}
              <Th className="hidden sm:table-cell">{t("devices.statusLabel")}</Th>
              <Th className="hidden lg:table-cell">{t("sales.date")}</Th>
              <Th className="text-right">{t("list.actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => {
              const pending = sale.status === "PENDING_APPROVAL";
              const share = isDealer ? sale.dealer_share : sale.shop_share;
              return (
                <tr key={sale.id} className="hover:bg-surface-2/60">
                  <Td>
                    <DeviceCell device={sale.devices} />
                    <div className="mt-1 sm:hidden">
                      <Badge tone={saleTones[sale.status]}>{t(`sales.status.${sale.status}`)}</Badge>
                    </div>
                    {pending && sale.consignments ? (
                      <p className="mt-1 text-xs font-medium text-warning">
                        {t("sales.belowFloorNote", {
                          floor: money(sale.consignments.floor_price),
                        })}
                      </p>
                    ) : null}
                  </Td>
                  <Td className="hidden md:table-cell">
                    <p className="font-medium">{sale.customers?.name}</p>
                    {shopId && sale.users?.name && sale.seller_user_id !== userId ? (
                      <p className="text-xs text-muted">
                        {t("sales.soldBy", { name: sale.users.name })}
                      </p>
                    ) : null}
                  </Td>
                  <Td className="text-right font-semibold">{money(sale.sale_price)}</Td>
                  {shopId ? (
                    <Td className="hidden text-right lg:table-cell">
                      {share === null ? "—" : money(share)}
                    </Td>
                  ) : null}
                  <Td className="hidden sm:table-cell">
                    <Badge tone={saleTones[sale.status]}>{t(`sales.status.${sale.status}`)}</Badge>
                  </Td>
                  <Td className="hidden text-muted lg:table-cell">
                    {format.dateTime(new Date(sale.created_at), { dateStyle: "medium" })}
                  </Td>
                  <Td>
                    <RowActions>
                      {pending && role === "OWNER" && shopId ? (
                        <>
                          <form action={decideSale.bind(null, shopId, sale.id, false)}>
                            <Button type="submit" variant="danger" className="min-h-11 px-3 text-sm">
                              {t("sales.reject")}
                            </Button>
                          </form>
                          <form action={decideSale.bind(null, shopId, sale.id, true)}>
                            <Button type="submit" className="min-h-11 px-3 text-sm">
                              {t("sales.approve")}
                            </Button>
                          </form>
                        </>
                      ) : null}
                      {sale.status === "COMPLETED" ? (
                        <ActionLink kind="view" label={t("list.view")} href={`${path}/${sale.id}`} />
                      ) : null}
                    </RowActions>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      )}
      <ListPagination page={page} total={count ?? 0} path={path} />
    </>
  );
}

// ---------- Dépôts ----------
// Le patron voit tous les dépôts de la boutique ; le dealer, les siens.

export async function ConsignmentsList({
  supabase,
  shop,
  role,
  page,
}: {
  supabase: Supabase;
  shop: { id: string; currency: string };
  role: MemberRole;
  page: number;
}) {
  if (role === "CASHIER") notFound();
  const t = await getTranslations();
  const format = await getFormatter();
  const isDealer = role === "DEALER";
  const { from, to } = pageRange(page);
  const path = `/s/${shop.id}/consignments`;

  const { data: consignments, count } = await supabase
    .from("consignments")
    .select(
      "id, status, due_on, floor_price, device_id, devices(model, capacity, color), users!consignments_dealer_user_id_fkey(name)",
      { count: "exact" },
    )
    .eq("shop_id", shop.id)
    .order("status")
    .order("due_on")
    .range(from, to);

  return (
    <>
      <PageHeader
        title={t(isDealer ? "consignments.mineTitle" : "consignments.title")}
        subtitle={t(isDealer ? "consignments.mineSubtitle" : "consignments.subtitle")}
      />
      {!consignments || consignments.length === 0 ? (
        <Card className="text-muted lg:max-w-xl">
          {t(isDealer ? "consignments.mineEmpty" : "consignments.empty")}
        </Card>
      ) : (
        <TableCard>
          <thead>
            <tr>
              <Th>{t("devices.device")}</Th>
              {isDealer ? null : <Th className="hidden md:table-cell">{t("consignments.dealer")}</Th>}
              <Th>{t("consignments.dueOn")}</Th>
              <Th className="hidden text-right lg:table-cell">{t("consignments.floor")}</Th>
              <Th className="hidden sm:table-cell">{t("devices.statusLabel")}</Th>
              <Th className="text-right">{t("list.actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {consignments.map((c) => {
              const overdue = c.status === "ACTIVE" && c.due_on < today();
              const status = (
                <span className="flex flex-wrap gap-1">
                  <Badge tone={consignmentTones[c.status]}>
                    {t(`consignments.status.${c.status}`)}
                  </Badge>
                  {overdue ? <Badge tone="danger">{t("consignments.overdue")}</Badge> : null}
                </span>
              );
              return (
                <tr key={c.id} className="hover:bg-surface-2/60">
                  <Td>
                    <DeviceCell device={c.devices} />
                    <div className="mt-1 sm:hidden">{status}</div>
                  </Td>
                  {isDealer ? null : (
                    <Td className="hidden font-medium md:table-cell">{c.users?.name}</Td>
                  )}
                  <Td className={overdue ? "font-semibold text-danger" : ""}>
                    {format.dateTime(new Date(c.due_on), { dateStyle: "medium" })}
                  </Td>
                  <Td className="hidden text-right lg:table-cell">
                    {formatMoney(c.floor_price, shop.currency)}
                  </Td>
                  <Td className="hidden sm:table-cell">{status}</Td>
                  <Td>
                    <RowActions>
                      <ActionLink
                        kind="view"
                        label={t("list.view")}
                        href={isDealer ? `${path}/${c.id}` : `/s/${shop.id}/devices/${c.device_id}`}
                      />
                    </RowActions>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      )}
      <ListPagination page={page} total={count ?? 0} path={path} />
    </>
  );
}

// ---------- Clients ----------

export async function CustomersList({
  supabase,
  shopId,
  role,
  userId,
  page,
}: {
  supabase: Supabase;
  shopId: string | null;
  role: MemberRole | null;
  userId: string;
  page: number;
}) {
  const t = await getTranslations();
  const format = await getFormatter();
  const { from, to } = pageRange(page);
  const path = shopId ? `/s/${shopId}/customers` : "/perso/customers";

  // La base ne renvoie que les clients visibles par l'utilisateur ; le filtre
  // désigne l'espace (boutique ou perso) dans lequel on se trouve.
  const query = supabase
    .from("customers")
    .select("id, name, phone, created_at", { count: "exact" })
    .order("name")
    .range(from, to);
  const { data: customers, count } = await (shopId
    ? query.eq("shop_id", shopId)
    : query.eq("owner_user_id", userId));

  const subtitle = !shopId
    ? "customers.personalSubtitle"
    : role === "DEALER"
      ? "customers.mineSubtitle"
      : "customers.subtitle";

  return (
    <>
      <PageHeader
        title={t(shopId ? "customers.title" : "customers.personalTitle")}
        subtitle={t(subtitle)}
      />
      {!customers || customers.length === 0 ? (
        <Card className="text-muted lg:max-w-xl">{t("customers.empty")}</Card>
      ) : (
        <TableCard>
          <thead>
            <tr>
              <Th>{t("customers.name")}</Th>
              <Th>{t("customers.phone")}</Th>
              <Th className="hidden sm:table-cell">{t("list.addedOn")}</Th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-surface-2/60">
                <Td className="font-semibold">{customer.name}</Td>
                <Td className={customer.phone ? "" : "text-muted"}>
                  {customer.phone ?? t("customers.noPhone")}
                </Td>
                <Td className="hidden text-muted sm:table-cell">
                  {format.dateTime(new Date(customer.created_at), { dateStyle: "medium" })}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
      <ListPagination page={page} total={count ?? 0} path={path} />
    </>
  );
}
