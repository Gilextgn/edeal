import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { icons } from "@/components/icons";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { formatMoney } from "@/domain/money";
import type { createClient } from "@/lib/supabase/server";
import { StatusBadge, Variant } from "./labels";
import type { DeviceScope } from "./scope";

type Props = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  scope: DeviceScope;
  userId: string;
};

export async function DeviceList({ supabase, scope, userId }: Props) {
  const t = await getTranslations("devices");

  // Le filtre désigne l'espace affiché ; la base, elle, ne renvoie de toute
  // façon que les appareils que l'utilisateur a le droit de voir.
  const query = supabase
    .from("devices")
    .select("id, imei, model, capacity, color, target_price, status")
    .order("created_at", { ascending: false });
  const { data: devices } = await (scope.shopId
    ? query.eq("shop_id", scope.shopId)
    : query.eq("owner_user_id", userId));

  return (
    <>
      <PageHeader
        title={t(scope.shopId ? "stockTitle" : "personalTitle")}
        subtitle={t(scope.shopId ? "stockSubtitle" : "personalSubtitle")}
        action={
          scope.canWrite ? (
            <ButtonLink href={`${scope.basePath}/new`} className="w-full sm:w-auto">
              {icons.plus}
              {t("add")}
            </ButtonLink>
          ) : null
        }
      />

      {!devices || devices.length === 0 ? (
        <Card className="text-muted lg:max-w-xl">{t("empty")}</Card>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">{t("count", { count: devices.length })}</p>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {devices.map((device) => (
              <li key={device.id}>
                <Link
                  href={`${scope.basePath}/${device.id}`}
                  className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{device.model}</p>
                      <p className="text-sm text-muted">
                        <Variant capacity={device.capacity} color={device.color} />
                      </p>
                    </div>
                    <StatusBadge status={device.status} />
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3">
                    <p className="font-mono text-xs text-muted">{device.imei}</p>
                    <p className="font-semibold">
                      {formatMoney(device.target_price, scope.currency)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
