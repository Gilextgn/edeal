import { getFormatter, getTranslations } from "next-intl/server";
import { ConfirmForm } from "@/components/confirm-form";
import { icons } from "@/components/icons";
import { ListPagination, ListSearch } from "@/components/list";
import {
  ActionButton,
  ActionLink,
  ButtonLink,
  Card,
  FormMessage,
  PageHeader,
  RowActions,
  TableCard,
  Td,
  Th,
} from "@/components/ui";
import { formatMoney } from "@/domain/money";
import { pageRange } from "@/domain/pagination";
import type { createClient } from "@/lib/supabase/server";
import { deleteDevice } from "./actions";
import { DeviceCard, loadDeviceCovers } from "./device-cards";
import { StatusBadge, Variant } from "./labels";
import type { DeviceScope } from "./scope";

type Props = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  scope: DeviceScope;
  userId: string;
  page: number;
  // Texte cherché dans l'IMEI ou le modèle.
  search: string;
  // Résultat d'une suppression, à afficher en haut de la liste.
  notice?: string;
};

const NOTICES = { deleted: "success", has_history: "warning", not_allowed: "danger" } as const;

export async function DeviceList({ supabase, scope, userId, page, search, notice }: Props) {
  const t = await getTranslations();
  const format = await getFormatter();
  const { from, to } = pageRange(page);

  // Le filtre désigne l'espace affiché ; la base, elle, ne renvoie de toute
  // façon que les appareils que l'utilisateur a le droit de voir.
  let query = supabase
    .from("devices")
    .select("id, imei, model, capacity, color, target_price, status, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);
  query = scope.shopId ? query.eq("shop_id", scope.shopId) : query.eq("owner_user_id", userId);
  if (search) query = query.or(`imei.ilike.%${search}%,model.ilike.%${search}%`);
  const { data: devices, count } = await query;
  const covers = await loadDeviceCovers(
    supabase,
    (devices ?? []).map((device) => device.id),
  );

  const tone = notice && notice in NOTICES ? NOTICES[notice as keyof typeof NOTICES] : null;

  return (
    <>
      <PageHeader
        title={t(scope.shopId ? "devices.stockTitle" : "devices.personalTitle")}
        subtitle={t(scope.shopId ? "devices.stockSubtitle" : "devices.personalSubtitle")}
        action={
          scope.canWrite ? (
            <ButtonLink href={`${scope.basePath}/new`} className="w-full sm:w-auto">
              {icons.plus}
              {t("devices.add")}
            </ButtonLink>
          ) : null
        }
      />

      {tone ? (
        <div className="mb-4">
          <FormMessage tone={tone}>{t(`devices.notices.${notice}`)}</FormMessage>
        </div>
      ) : null}

      <ListSearch path={scope.basePath} value={search} placeholder={t("devices.search")} />

      {!devices || devices.length === 0 ? (
        <Card className="text-muted lg:max-w-xl">
          {t(search ? "list.noResult" : "devices.empty")}
        </Card>
      ) : (
        <>
        {/* Téléphone : deux cartes par ligne, comme un catalogue. */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              href={`${scope.basePath}/${device.id}`}
              model={device.model}
              variant={<Variant capacity={device.capacity} color={device.color} />}
              price={formatMoney(device.target_price, scope.currency)}
              cover={covers.get(device.id)}
              badge={device.status === "IN_STOCK" ? null : <StatusBadge status={device.status} />}
            />
          ))}
        </div>
        {/* Écran plus large : tableau, avec les actions par ligne. */}
        <div className="hidden md:block">
        <TableCard>
          <thead>
            <tr>
              <Th>{t("devices.device")}</Th>
              <Th className="hidden sm:table-cell">{t("devices.statusLabel")}</Th>
              <Th className="hidden text-right sm:table-cell">{t("devices.targetPriceLabel")}</Th>
              <Th className="hidden lg:table-cell">{t("list.addedOn")}</Th>
              <Th className="text-right">{t("list.actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => {
              const href = `${scope.basePath}/${device.id}`;
              const removable = device.status === "IN_STOCK" || device.status === "WITHDRAWN";
              return (
                <tr key={device.id} className="hover:bg-surface-2/60">
                  <Td>
                    <p className="font-semibold">{device.model}</p>
                    <p className="text-muted">
                      <Variant capacity={device.capacity} color={device.color} />
                    </p>
                    <p className="font-mono text-xs text-muted">{device.imei}</p>
                    <div className="mt-1 sm:hidden">
                      <StatusBadge status={device.status} />
                    </div>
                  </Td>
                  <Td className="hidden sm:table-cell">
                    <StatusBadge status={device.status} />
                  </Td>
                  <Td className="hidden text-right font-semibold sm:table-cell">
                    {formatMoney(device.target_price, scope.currency)}
                  </Td>
                  <Td className="hidden text-muted lg:table-cell">
                    {format.dateTime(new Date(device.created_at), { dateStyle: "medium" })}
                  </Td>
                  <Td>
                    <RowActions>
                      <ActionLink kind="view" label={t("list.view")} href={href} />
                      {scope.canWrite ? (
                        <ActionLink kind="edit" label={t("list.edit")} href={`${href}/edit`} />
                      ) : null}
                      {scope.canWrite && removable ? (
                        <ConfirmForm
                          action={deleteDevice.bind(null, scope.shopId, device.id)}
                          message={t("devices.confirmDelete", { model: device.model })}
                        >
                          <ActionButton kind="delete" label={t("list.delete")} />
                        </ConfirmForm>
                      ) : null}
                    </RowActions>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
        </div>
        </>
      )}

      <ListPagination
        page={page}
        total={count ?? 0}
        path={scope.basePath}
        query={{ q: search }}
      />
    </>
  );
}
