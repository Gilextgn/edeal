"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ChoiceCards } from "@/components/choices";
import { ConfirmButton } from "@/components/confirm";
import { icons } from "@/components/icons";
import { SearchSelect } from "@/components/search-select";
import { ButtonLink, Card, Field, FormMessage, buttonClass } from "@/components/ui";
import { createAccount } from "../../actions";

type Shop = { id: string; name: string };

// Formulaire du superadmin : le compte, puis l'accès qu'il donne. Une fois
// créé, l'écran montre les identifiants à transmettre (une seule fois).
export function CreateAccountForm({ shops }: { shops: Shop[] }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(createAccount, null);
  const values = state?.values ?? {};
  const [access, setAccess] = useState(values.access || "none");
  const [role, setRole] = useState(values.role || "DEALER");
  const [copied, setCopied] = useState(false);

  if (state?.done) {
    const done = state.done;
    return (
      <div className="flex flex-col gap-4">
        <FormMessage tone="success">{t("admin.created", { name: done.name })}</FormMessage>
        <Card className="flex flex-col gap-4">
          <p className="font-bold">{t("admin.credentialsTitle")}</p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface-2 p-4">
              <dt className="text-sm text-muted">{t("admin.credentialsLogin")}</dt>
              <dd className="mt-1 font-bold break-all">{done.identifier}</dd>
            </div>
            <div className="rounded-2xl bg-surface-2 p-4">
              <dt className="text-sm text-muted">{t("admin.credentialsPassword")}</dt>
              <dd className="mt-1 font-mono text-lg font-bold tracking-wider">{done.password}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted">{t("admin.credentialsHint")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {done.whatsapp || done.mailto ? (
              <a
                href={done.whatsapp ?? done.mailto ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("primary", "w-full sm:w-auto")}
              >
                {t(done.whatsapp ? "members.sendWhatsapp" : "members.sendEmail")}
              </a>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(done.message);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              className={buttonClass("secondary", "w-full sm:w-auto")}
            >
              {copied ? icons.check : null}
              {t(copied ? "admin.copied" : "admin.copyMessage")}
            </button>
          </div>
        </Card>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={`/admin/users/${done.userId}`} variant="secondary" className="w-full sm:w-auto">
            {t("admin.openAccount")}
          </ButtonLink>
          {/* Rechargement complet : repart d'un formulaire vide. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/admin/users/new" className={buttonClass("secondary", "w-full sm:w-auto")}>
            {icons.plus}
            {t("admin.createAnother")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <form action={action} className="flex flex-col gap-5">
        <Field name="name" label={t("auth.name")} required maxLength={80} defaultValue={values.name} />
        <Field
          name="identifier"
          label={t("auth.identifier")}
          hint={t("auth.identifierHint")}
          autoCapitalize="none"
          required
          defaultValue={values.identifier}
        />

        <ChoiceCards
          legend={t("admin.accessLegend")}
          name="access"
          value={access}
          onChange={setAccess}
          options={[
            { value: "none", label: t("admin.access.none"), hint: t("admin.accessHints.none") },
            { value: "owner", label: t("admin.access.owner"), hint: t("admin.accessHints.owner") },
            ...(shops.length > 0
              ? [{ value: "member", label: t("admin.access.member"), hint: t("admin.accessHints.member") }]
              : []),
          ]}
        />

        {access === "owner" ? (
          <Field
            name="shopName"
            label={t("shopForm.name")}
            required
            maxLength={60}
            defaultValue={values.shopName}
          />
        ) : null}

        {access === "member" ? (
          <>
            <SearchSelect
              name="shopId"
              label={t("admin.shopLabel")}
              options={shops.map((shop) => ({ value: shop.id, label: shop.name }))}
              placeholder={t("devices.choose")}
              searchPlaceholder={t("list.searchIn")}
              emptyLabel={t("list.noResult")}
              defaultValue={values.shopId}
            />
            <ChoiceCards
              legend={t("members.role")}
              name="role"
              value={role}
              onChange={setRole}
              options={[
                { value: "DEALER", label: t("roles.DEALER"), hint: t("members.roleHints.DEALER") },
                { value: "CASHIER", label: t("roles.CASHIER"), hint: t("members.roleHints.CASHIER") },
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
                defaultValue={values.rate}
              />
            ) : null}
          </>
        ) : null}

        {state?.error ? <FormMessage tone="danger">{t(state.error)}</FormMessage> : null}

        <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
          <ConfirmButton
            confirm={{ message: t("admin.confirmCreate") }}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {pending ? t("common.pending") : t("admin.createAccount")}
          </ConfirmButton>
          <ButtonLink href="/admin/users" variant="secondary" className="w-full sm:w-auto">
            {t("common.cancel")}
          </ButtonLink>
        </div>
      </form>
    </Card>
  );
}
