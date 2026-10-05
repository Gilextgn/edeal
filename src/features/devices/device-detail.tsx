import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { icons } from "@/components/icons";
import { Badge, Button, ButtonLink, Card, FormMessage, PageHeader } from "@/components/ui";
import { FUNCTION_CHECKS } from "@/domain/condition-report";
import { formatMoney } from "@/domain/money";
import type { createClient } from "@/lib/supabase/server";
import { setDeviceWithdrawn } from "./actions";
import { StatusBadge, Variant } from "./labels";
import type { DeviceScope } from "./scope";

const SIGNED_URL_SECONDS = 3600;

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

  const { data: reports } = await supabase
    .from("condition_reports")
    .select("*, photos(id, angle, storage_key), users(name)")
    .eq("device_id", device.id)
    .order("created_at", { ascending: false });

  // Seule la clé est en base : les liens signés sont créés à la lecture.
  const keys = (reports ?? []).flatMap((r) => r.photos.map((p) => p.storage_key));
  const { data: signed } = keys.length
    ? await supabase.storage.from("photos").createSignedUrls(keys, SIGNED_URL_SECONDS)
    : { data: [] };
  const urlOf = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const base = `${scope.basePath}/${device.id}`;
  const canChangeStock =
    scope.canWrite && (device.status === "IN_STOCK" || device.status === "WITHDRAWN");

  return (
    <>
      <PageHeader
        title={device.model}
        subtitle={`${t("devices.imei")} ${device.imei}`}
        action={
          scope.canWrite ? (
            <ButtonLink href={`${base}/reports/new`} className="w-full sm:w-auto">
              {icons.plus}
              {t("reports.add")}
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
        <Card className="flex flex-col gap-4 lg:sticky lg:top-9">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">
              <Variant capacity={device.capacity} color={device.color} />
            </p>
            <StatusBadge status={device.status} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">{t("devices.purchasePriceLabel")}</dt>
              <dd className="font-semibold">
                {formatMoney(device.purchase_price, scope.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t("devices.targetPriceLabel")}</dt>
              <dd className="font-semibold">
                {formatMoney(device.target_price, scope.currency)}
              </dd>
            </div>
          </dl>
          <p className="text-sm text-muted">
            {t("devices.addedOn", {
              date: format.dateTime(new Date(device.created_at), { dateStyle: "long" }),
            })}
          </p>
          {scope.canWrite ? (
            <div className="flex flex-col gap-2">
              <ButtonLink href={`${base}/edit`} variant="secondary">
                {t("devices.edit")}
              </ButtonLink>
              {canChangeStock ? (
                <form
                  action={setDeviceWithdrawn.bind(
                    null,
                    scope.shopId,
                    device.id,
                    device.status === "IN_STOCK",
                  )}
                >
                  <Button
                    type="submit"
                    variant={device.status === "IN_STOCK" ? "danger" : "secondary"}
                    className="w-full"
                  >
                    {t(device.status === "IN_STOCK" ? "devices.withdraw" : "devices.restore")}
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null}
        </Card>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {t("reports.title")}
          </h2>
          {!reports || reports.length === 0 ? (
            <Card className="text-muted">{t("reports.none")}</Card>
          ) : (
            reports.map((report) => {
              const date = format.dateTime(new Date(report.created_at), {
                dateStyle: "long",
                timeStyle: "short",
              });
              return (
                <Card key={report.id} className="flex flex-col gap-4">
                  <div>
                    <p className="font-semibold">{t(`reports.types.${report.type}`)}</p>
                    <p className="text-sm text-muted">
                      {report.users?.name
                        ? t("reports.by", { name: report.users.name, date })
                        : t("reports.onDate", { date })}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge tone="primary">{t(`reports.grades.${report.grade}`)}</Badge>
                    <Badge tone={report.icloud_unlocked ? "success" : "danger"}>
                      {t(report.icloud_unlocked ? "reports.icloudUnlocked" : "reports.icloudLocked")}
                    </Badge>
                    <Badge>
                      {report.battery_health === null
                        ? t("reports.batteryUnknown")
                        : t("reports.batteryValue", { value: report.battery_health })}
                    </Badge>
                  </div>

                  <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted">{t("reports.screen")}</dt>
                      <dd className="font-medium">
                        {t(`reports.screens.${report.screen_condition}`)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">{t("reports.body")}</dt>
                      <dd className="font-medium">
                        {t(`reports.bodies.${report.body_condition}`)}
                      </dd>
                    </div>
                    {FUNCTION_CHECKS.map((check) => (
                      <div key={check}>
                        <dt className="text-muted">{t(`reports.checks.${check}`)}</dt>
                        <dd className={`font-medium ${report[check] ? "" : "text-danger"}`}>
                          {t(report[check] ? "reports.works" : "reports.broken")}
                        </dd>
                      </div>
                    ))}
                    <div>
                      <dt className="text-muted">{t("reports.repairs")}</dt>
                      <dd className="font-medium">
                        {report.past_repairs.length
                          ? report.past_repairs
                              .map((r) => t(`reports.repairOptions.${r}`))
                              .join(", ")
                          : t("reports.repairsNone")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">{t("reports.accessories")}</dt>
                      <dd className="font-medium">
                        {report.accessories.length
                          ? report.accessories
                              .map((a) => t(`reports.accessoryOptions.${a}`))
                              .join(", ")
                          : t("reports.accessoriesNone")}
                      </dd>
                    </div>
                  </dl>

                  {report.comment ? (
                    <p className="rounded-xl bg-surface-2 p-3 text-sm">{report.comment}</p>
                  ) : null}

                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                    {report.photos.map((photo) => {
                      const url = urlOf.get(photo.storage_key);
                      const label = t(`reports.angles.${photo.angle}`);
                      return url ? (
                        <li key={photo.id}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            {/* Lien signé temporaire : pas d'optimisation d'image possible. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={label}
                              loading="lazy"
                              className="aspect-square w-full rounded-lg border border-border object-cover"
                            />
                            <span className="mt-1 block truncate text-xs text-muted">{label}</span>
                          </a>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </Card>
              );
            })
          )}
        </section>
      </div>
    </>
  );
}
