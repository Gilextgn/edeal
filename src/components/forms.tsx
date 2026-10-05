"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { FormState } from "@/lib/form";
import { ChoiceCards } from "./choices";
import { Button, ButtonLink, Field, FormMessage } from "./ui";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

function Feedback({ state }: { state: FormState }) {
  const t = useTranslations();
  if (state?.error) return <FormMessage tone="danger">{t(state.error)}</FormMessage>;
  if (state?.success) return <FormMessage tone="success">{t(state.success)}</FormMessage>;
  return null;
}

function Actions({
  pending,
  submitLabel,
  cancelHref,
}: {
  pending: boolean;
  submitLabel: string;
  cancelHref?: string;
}) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? t("pending") : submitLabel}
      </Button>
      {cancelHref ? (
        <ButtonLink href={cancelHref} variant="secondary" className="w-full sm:w-auto">
          {t("cancel")}
        </ButtonLink>
      ) : null}
    </div>
  );
}

export function ShopForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: Action;
  initial?: { name: string; phone: string; address: string };
  submitLabel: string;
  cancelHref?: string;
}) {
  const t = useTranslations("shopForm");
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initial;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        name="name"
        label={t("name")}
        placeholder={t("namePlaceholder")}
        maxLength={60}
        required
        defaultValue={values?.name}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="phone"
          type="tel"
          label={t("phone")}
          hint={t("optional")}
          maxLength={30}
          defaultValue={values?.phone}
        />
        <Field
          name="address"
          label={t("address")}
          hint={t("optional")}
          maxLength={200}
          defaultValue={values?.address}
        />
      </div>
      <Feedback state={state} />
      <Actions pending={pending} submitLabel={submitLabel} cancelHref={cancelHref} />
    </form>
  );
}

export function MemberForm({
  action,
  mode,
  initial,
  cancelHref,
  submitLabel,
}: {
  action: Action;
  mode: "add" | "edit";
  initial?: { role: string; rate: string; active: boolean };
  cancelHref: string;
  submitLabel: string;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(action, null);
  const [role, setRole] = useState(initial?.role ?? "DEALER");
  const [active, setActive] = useState(String(initial?.active ?? true));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {mode === "add" ? (
        <Field
          name="identifier"
          label={t("members.identifier")}
          hint={t("auth.identifierHint")}
          autoCapitalize="none"
          required
          defaultValue={state?.values?.identifier}
        />
      ) : null}

      <ChoiceCards
        legend={t("members.role")}
        name="role"
        value={role}
        onChange={setRole}
        options={[
          {
            value: "DEALER",
            label: t("roles.DEALER"),
            hint: t("members.roleHints.DEALER"),
          },
          {
            value: "CASHIER",
            label: t("roles.CASHIER"),
            hint: t("members.roleHints.CASHIER"),
          },
        ]}
      />

      {role === "DEALER" ? (
        <Field
          name="rate"
          label={t("members.rate")}
          hint={t("members.rateHint")}
          inputMode="decimal"
          required
          className="sm:max-w-xs"
          defaultValue={state?.values?.rate ?? initial?.rate}
        />
      ) : null}

      {mode === "edit" ? (
        <ChoiceCards
          legend={t("members.status")}
          name="active"
          value={active}
          onChange={setActive}
          options={[
            {
              value: "true",
              label: t("members.active"),
              hint: t("members.statusHints.active"),
            },
            {
              value: "false",
              label: t("members.inactive"),
              hint: t("members.statusHints.inactive"),
            },
          ]}
        />
      ) : null}

      <Feedback state={state} />
      <Actions pending={pending} submitLabel={submitLabel} cancelHref={cancelHref} />
    </form>
  );
}

export function ProfileForm({
  action,
  name,
  children,
}: {
  action: Action;
  name: string;
  children?: ReactNode;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        name="name"
        label={t("auth.name")}
        autoComplete="name"
        maxLength={80}
        required
        defaultValue={state?.values?.name ?? name}
      />
      {children}
      <Feedback state={state} />
      <Actions pending={pending} submitLabel={t("common.save")} />
    </form>
  );
}
