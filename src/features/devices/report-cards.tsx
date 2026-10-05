import { getFormatter, getTranslations } from "next-intl/server";
import { Badge, Card } from "@/components/ui";
import { FUNCTION_CHECKS } from "@/domain/condition-report";
import type { createClient } from "@/lib/supabase/server";

const SIGNED_URL_SECONDS = 3600;

// Historique des constats d'un appareil, du plus récent au plus ancien.
// La base ne renvoie que les constats que l'utilisateur a le droit de lire.
export async function ReportCards({
  supabase,
  deviceId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  deviceId: string;
}) {
  const t = await getTranslations();
  const format = await getFormatter();

  const { data: reports } = await supabase
    .from("condition_reports")
    .select("*, photos(id, angle, storage_key), users(name)")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false });

  // Seule la clé est en base : les liens signés sont créés à la lecture.
  const keys = (reports ?? []).flatMap((r) => r.photos.map((p) => p.storage_key));
  const { data: signed } = keys.length
    ? await supabase.storage.from("photos").createSignedUrls(keys, SIGNED_URL_SECONDS)
    : { data: [] };
  const urlOf = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
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
                  <dd className="font-medium">{t(`reports.bodies.${report.body_condition}`)}</dd>
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
                      ? report.past_repairs.map((r) => t(`reports.repairOptions.${r}`)).join(", ")
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
  );
}
