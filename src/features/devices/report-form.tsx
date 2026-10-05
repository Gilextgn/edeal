"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChoiceCards, ToggleChips } from "@/components/choices";
import { Button, ButtonLink, Card, Field, FormMessage, Textarea } from "@/components/ui";
import {
  ACCESSORIES,
  BODY_CONDITIONS,
  FUNCTION_CHECKS,
  GRADES,
  MAX_PHOTOS,
  missingRequiredAngles,
  parseBatteryHealth,
  REPAIRS,
  REQUIRED_ANGLES,
  SCREEN_CONDITIONS,
  type PhotoAngle,
} from "@/domain/condition-report";
import {
  enqueueReport,
  listPendingReports,
  syncPendingReports,
} from "@/lib/offline/report-queue";
import { compressPhoto } from "@/lib/photos/compress";

type Photo = { id: string; angle: PhotoAngle; blob: Blob; url: string; takenAt: string };

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function ReportForm({
  deviceId,
  userId,
  backHref,
}: {
  deviceId: string;
  userId: string;
  backHref: string;
}) {
  const t = useTranslations();
  const router = useRouter();

  const [grade, setGrade] = useState("");
  const [screen, setScreen] = useState("");
  const [body, setBody] = useState("");
  const [battery, setBattery] = useState("");
  // Coché par défaut : on décoche ce qui ne fonctionne pas.
  const [working, setWorking] = useState<string[]>([...FUNCTION_CHECKS]);
  const [icloud, setIcloud] = useState("");
  const [repairs, setRepairs] = useState<string[]>([]);
  const [accessories, setAccessories] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);

  // Libère les aperçus à la fermeture de l'écran.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  async function addPhoto(angle: PhotoAngle, file: File | undefined, replaceId?: string) {
    if (!file) return;
    setError(null);
    if (!replaceId && photos.length >= MAX_PHOTOS) {
      setError(t("reports.errors.too_many_photos"));
      return;
    }
    try {
      const blob = await compressPhoto(file);
      const photo: Photo = {
        id: crypto.randomUUID(),
        angle,
        blob,
        url: URL.createObjectURL(blob),
        takenAt: new Date().toISOString(),
      };
      setPhotos((current) => {
        const replaced = current.find((p) => p.id === replaceId);
        if (replaced) URL.revokeObjectURL(replaced.url);
        return [...current.filter((p) => p.id !== replaceId), photo];
      });
    } catch {
      setError(t("reports.errors.photo_failed"));
    }
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      current.filter((p) => p.id === id).forEach((p) => URL.revokeObjectURL(p.url));
      return current.filter((p) => p.id !== id);
    });
  }

  function validate(): string | null {
    if (!grade) return t("reports.errors.grade_required");
    if (!screen) return t("reports.errors.screen_required");
    if (!body) return t("reports.errors.body_required");
    if (parseBatteryHealth(battery) === undefined) return t("reports.errors.battery_invalid");
    if (!icloud) return t("reports.errors.icloud_required");
    const missing = missingRequiredAngles(photos.map((p) => p.angle));
    if (missing.length > 0) {
      return t("reports.errors.missing_photos", {
        angles: missing.map((angle) => t(`reports.angles.${angle}`)).join(", "),
      });
    }
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setSending(true);
    setError(null);
    try {
      // D'abord sur le téléphone, ensuite vers le serveur : si la connexion
      // tombe, rien n'est perdu et l'envoi reprendra plus tard.
      const id = crypto.randomUUID();
      await enqueueReport({
        id,
        userId,
        deviceId,
        createdAt: new Date().toISOString(),
        report: {
          grade,
          screen_condition: screen,
          body_condition: body,
          battery_health: parseBatteryHealth(battery) ?? null,
          ...Object.fromEntries(FUNCTION_CHECKS.map((c) => [c, working.includes(c)])),
          past_repairs: repairs,
          accessories,
          icloud_unlocked: icloud === "true",
          comment,
        },
        photos: photos.map((p) => ({
          id: p.id,
          angle: p.angle,
          taken_at: p.takenAt,
          blob: p.blob,
        })),
      });
      await syncPendingReports(userId);

      const waiting = await listPendingReports(userId);
      if (waiting.some((item) => item.id === id)) {
        // Pas de connexion : on reste ici, le bandeau en haut suit l'envoi.
        setSavedOffline(true);
        return;
      }
      router.push(backHref);
      router.refresh();
    } catch {
      setError(t("errors.generic"));
      setSending(false);
    }
  }

  const options = (keys: readonly string[], labels: string, hints?: string) =>
    keys.map((value) => ({
      value,
      label: t(`${labels}.${value}`),
      hint: hints ? t(`${hints}.${value}`) : undefined,
    }));

  const extras = photos.filter((p) => p.angle === "SIDES" || p.angle === "DEFECT");

  if (savedOffline) {
    return (
      <Card className="flex flex-col gap-4">
        <FormMessage tone="success">{t("sync.savedOffline")}</FormMessage>
        <ButtonLink href={backHref} variant="secondary" className="w-full sm:w-auto sm:self-start">
          {t("common.back")}
        </ButtonLink>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Card className="flex flex-col gap-6">
        <ChoiceCards
          legend={t("reports.grade")}
          name="grade"
          value={grade}
          onChange={setGrade}
          columns={4}
          options={options(GRADES, "reports.grades", "reports.gradeHints")}
        />
        <ChoiceCards
          legend={t("reports.screen")}
          name="screen"
          value={screen}
          onChange={setScreen}
          columns={4}
          options={options(SCREEN_CONDITIONS, "reports.screens")}
        />
        <ChoiceCards
          legend={t("reports.body")}
          name="body"
          value={body}
          onChange={setBody}
          columns={4}
          options={options(BODY_CONDITIONS, "reports.bodies")}
        />
      </Card>

      <Card className="flex flex-col gap-6">
        <Field
          name="battery"
          label={t("reports.battery")}
          hint={t("reports.batteryHint")}
          inputMode="numeric"
          className="sm:max-w-md"
          value={battery}
          onChange={(event) => setBattery(event.target.value)}
        />
        <ToggleChips
          legend={t("reports.functions")}
          hint={t("reports.functionsHint")}
          options={options(FUNCTION_CHECKS, "reports.checks")}
          selected={working}
          onToggle={(value) => setWorking((current) => toggle(current, value))}
        />
        <ChoiceCards
          legend={t("reports.icloud")}
          name="icloud"
          value={icloud}
          onChange={setIcloud}
          options={options(["true", "false"], "reports.icloudOptions", "reports.icloudHints")}
        />
      </Card>

      <Card className="flex flex-col gap-6">
        <ToggleChips
          legend={t("reports.repairs")}
          options={options(REPAIRS, "reports.repairOptions")}
          selected={repairs}
          onToggle={(value) => setRepairs((current) => toggle(current, value))}
        />
        <ToggleChips
          legend={t("reports.accessories")}
          options={options(ACCESSORIES, "reports.accessoryOptions")}
          selected={accessories}
          onToggle={(value) => setAccessories((current) => toggle(current, value))}
        />
        <Textarea
          name="comment"
          label={t("reports.comment")}
          hint={t("reports.commentHint")}
          maxLength={500}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </Card>

      <Card>
        <h2 className="font-semibold">{t("reports.photos")}</h2>
        <p className="mb-4 text-sm text-muted">{t("reports.photosHint")}</p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {REQUIRED_ANGLES.map((angle) => (
            <PhotoSlot
              key={angle}
              label={t(`reports.angles.${angle}`)}
              note={t("reports.required")}
              photo={photos.find((p) => p.angle === angle)}
              takeLabel={t("reports.takePhoto")}
              retakeLabel={t("reports.retakePhoto")}
              onFile={(file, replaceId) => addPhoto(angle, file, replaceId)}
            />
          ))}
          {extras.map((photo) => (
            <PhotoSlot
              key={photo.id}
              label={t(`reports.angles.${photo.angle}`)}
              note={t("reports.optional")}
              photo={photo}
              takeLabel={t("reports.takePhoto")}
              retakeLabel={t("reports.retakePhoto")}
              removeLabel={t("reports.removePhoto")}
              onFile={(file, replaceId) => addPhoto(photo.angle, file, replaceId)}
              onRemove={() => removePhoto(photo.id)}
            />
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["SIDES", "DEFECT"] as const).map((angle) => (
            <label
              key={angle}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
            >
              + {t(`reports.angles.${angle}`)}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => {
                  void addPhoto(angle, event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          ))}
        </div>
      </Card>

      <p className="text-sm text-muted">{t("reports.immutableNote")}</p>
      {error ? <FormMessage tone="danger">{error}</FormMessage> : null}

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
        <Button type="submit" disabled={sending} className="w-full sm:w-auto">
          {sending ? t("reports.sending") : t("reports.submit")}
        </Button>
        <ButtonLink href={backHref} variant="secondary" className="w-full sm:w-auto">
          {t("common.cancel")}
        </ButtonLink>
      </div>
    </form>
  );
}

function PhotoSlot({
  label,
  note,
  photo,
  takeLabel,
  retakeLabel,
  removeLabel,
  onFile,
  onRemove,
}: {
  label: string;
  note: string;
  photo?: Photo;
  takeLabel: string;
  retakeLabel: string;
  removeLabel?: string;
  onFile: (file: File | undefined, replaceId?: string) => void;
  onRemove?: () => void;
}) {
  return (
    <li className="flex flex-col gap-1.5">
      <label className="relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed border-border bg-surface-2 p-2 text-center has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary">
        {photo ? (
          // Aperçu local (blob:) : pas d'optimisation d'image possible.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt={label} className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-xs text-muted">{takeLabel}</span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label={`${label} : ${photo ? retakeLabel : takeLabel}`}
          onChange={(event) => {
            onFile(event.target.files?.[0], photo?.id);
            event.target.value = "";
          }}
        />
      </label>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium">{label}</span>
        {photo && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="min-h-11 px-1 font-semibold text-danger underline"
          >
            {removeLabel}
          </button>
        ) : (
          <span className="text-muted">{photo ? retakeLabel : note}</span>
        )}
      </div>
    </li>
  );
}
