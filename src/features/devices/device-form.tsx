"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { SearchSelect } from "@/components/search-select";
import { Button, ButtonLink, Field, FormMessage } from "@/components/ui";
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
  // Textes communs aux listes déroulantes avec recherche.
  const choice = {
    placeholder: t("devices.choose"),
    searchPlaceholder: t("list.searchIn"),
    emptyLabel: t("list.noResult"),
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* La clé remonte le lecteur après un refus du serveur, avec l'IMEI déjà lu. */}
      {editing ? null : <ImeiScanner key={values.imei ?? ""} initial={values.imei} />}

      <SearchSelect
        name="model"
        label={t("devices.model")}
        defaultValue={values.model ?? ""}
        options={BRANDS.flatMap((group) =>
          group.models.map((model) => ({ value: model, label: model, group: group.brand })),
        )}
        {...choice}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SearchSelect
          name="capacity"
          label={t("devices.capacity")}
          defaultValue={values.capacity ?? ""}
          options={CAPACITIES.map((capacity) => ({
            value: capacity,
            label: t(`catalog.capacity.${capacity}`),
          }))}
          {...choice}
        />
        <SearchSelect
          name="color"
          label={t("devices.color")}
          defaultValue={values.color ?? ""}
          options={COLORS.map((color) => ({ value: color, label: t(`catalog.color.${color}`) }))}
          {...choice}
        />
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
