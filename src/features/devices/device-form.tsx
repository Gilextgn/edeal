"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, ButtonLink, Field, FormMessage, Select } from "@/components/ui";
import { BRANDS, CAPACITIES, COLORS } from "@/domain/catalog";
import { currencyLabel } from "@/domain/money";
import type { FormState } from "@/lib/form";
import { ImeiScanner } from "./imei-scanner";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  currency: string;
  cancelHref: string;
  // Présent en modification : l'IMEI ne se change plus.
  initial?: Record<string, string>;
};

export function DeviceForm({ action, currency, cancelHref, initial }: Props) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial ?? {};
  const editing = Boolean(initial);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* La clé remonte le lecteur après un refus du serveur, avec l'IMEI déjà lu. */}
      {editing ? null : <ImeiScanner key={values.imei ?? ""} initial={values.imei} />}

      <Select name="model" label={t("devices.model")} required defaultValue={values.model ?? ""}>
        <option value="" disabled>
          {t("devices.choose")}
        </option>
        {BRANDS.map((group) => (
          <optgroup key={group.brand} label={group.brand}>
            {group.models.map((model) => (
              <option key={model}>{model}</option>
            ))}
          </optgroup>
        ))}
      </Select>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          name="capacity"
          label={t("devices.capacity")}
          required
          defaultValue={values.capacity ?? ""}
        >
          <option value="" disabled>
            {t("devices.choose")}
          </option>
          {CAPACITIES.map((capacity) => (
            <option key={capacity} value={capacity}>
              {t(`catalog.capacity.${capacity}`)}
            </option>
          ))}
        </Select>
        <Select name="color" label={t("devices.color")} required defaultValue={values.color ?? ""}>
          <option value="" disabled>
            {t("devices.choose")}
          </option>
          {COLORS.map((color) => (
            <option key={color} value={color}>
              {t(`catalog.color.${color}`)}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="purchase_price"
          label={t("devices.purchasePrice", { currency: currencyLabel(currency) })}
          inputMode="numeric"
          required
          defaultValue={values.purchase_price}
        />
        <Field
          name="target_price"
          label={t("devices.targetPrice", { currency: currencyLabel(currency) })}
          inputMode="numeric"
          required
          defaultValue={values.target_price}
        />
      </div>

      {state?.error ? <FormMessage tone="danger">{t(state.error)}</FormMessage> : null}

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? t("common.pending") : t(editing ? "common.save" : "devices.create")}
        </Button>
        <ButtonLink href={cancelHref} variant="secondary" className="w-full sm:w-auto">
          {t("common.cancel")}
        </ButtonLink>
      </div>
    </form>
  );
}
