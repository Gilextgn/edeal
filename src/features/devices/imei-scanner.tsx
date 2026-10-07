"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChoiceCards } from "@/components/choices";
import { icons } from "@/components/icons";
import { Field, FormMessage, focusRing } from "@/components/ui";
import { isValidImei, normalizeImei } from "@/domain/imei";
import { readImeiFromPhoto } from "@/lib/photos/read-imei";

type Status = "idle" | "reading" | "found" | "none" | "manual";

// L'IMEI ne se tape pas : on le lit sur une photo (prise sur place ou
// importée). La saisie à la main n'apparaît qu'en secours, si la photo est
// illisible. Le champ caché « imei » porte la valeur envoyée au serveur.
export function ImeiScanner({ initial = "" }: { initial?: string }) {
  const t = useTranslations("devices.scan");
  const [status, setStatus] = useState<Status>(initial ? "found" : "idle");
  const [candidates, setCandidates] = useState<string[]>(initial ? [initial] : []);
  const [imei, setImei] = useState(initial);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setStatus("reading");
    try {
      const found = await readImeiFromPhoto(file);
      setCandidates(found);
      setImei(found[0] ?? "");
      setStatus(found.length > 0 ? "found" : "none");
    } catch {
      setCandidates([]);
      setImei("");
      setStatus("none");
    }
  }

  const picker = (capture: boolean) => (
    <label
      className={`flex min-h-24 flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-surface-2 p-3 text-center text-sm font-semibold hover:border-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary`}
    >
      <span className="text-primary">{capture ? icons.camera : icons.upload}</span>
      {t(capture ? "take" : "upload")}
      <input
        type="file"
        accept="image/*"
        {...(capture ? { capture: "environment" as const } : {})}
        className="sr-only"
        disabled={status === "reading"}
        onChange={(event) => {
          void onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </label>
  );

  const digits = normalizeImei(imei);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-fg">{t("label")}</p>
        <p className="text-sm text-muted">{t("hint")}</p>
      </div>

      <div className="flex gap-3">
        {picker(true)}
        {picker(false)}
      </div>

      {/* Toujours possible de taper l'IMEI, sans attendre la lecture. */}
      {status === "manual" ? null : (
        <button
          type="button"
          onClick={() => setStatus("manual")}
          className={`min-h-11 self-start rounded-xl px-1 text-sm font-semibold text-primary underline ${focusRing}`}
        >
          {t("typeInstead")}
        </button>
      )}

      {status === "reading" ? <FormMessage tone="warning">{t("reading")}</FormMessage> : null}

      {status === "found" && candidates.length === 1 ? (
        <div className="flex items-center gap-3 rounded-xl bg-success-soft px-4 py-3 text-success">
          {icons.check}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider">{t("found")}</p>
            <p className="font-mono text-lg font-bold tracking-wider">{candidates[0]}</p>
          </div>
        </div>
      ) : null}

      {status === "found" && candidates.length > 1 ? (
        <ChoiceCards
          legend={t("several")}
          name="imei_choice"
          value={imei}
          onChange={setImei}
          options={candidates.map((value) => ({ value, label: value }))}
        />
      ) : null}

      {status === "none" ? (
        <div className="flex flex-col gap-2">
          <FormMessage tone="danger">{t("notFound")}</FormMessage>
        </div>
      ) : null}

      {status === "manual" ? (
        <div>
          <Field
            name="imei_manual"
            label={t("manualLabel")}
            hint={t("manualHint")}
            inputMode="numeric"
            autoComplete="off"
            value={imei}
            onChange={(event) => setImei(event.target.value)}
          />
          {digits.length >= 15 ? (
            <p
              className={`mt-1.5 text-sm font-medium ${isValidImei(digits) ? "text-success" : "text-danger"}`}
            >
              {t(isValidImei(digits) ? "valid" : "invalid")}
            </p>
          ) : null}
        </div>
      ) : null}

      <input type="hidden" name="imei" value={digits} />
    </div>
  );
}
