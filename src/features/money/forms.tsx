"use client";

import { useActionState, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ChoiceCards } from "@/components/choices";
import { ConfirmButton } from "@/components/confirm";
import { Field, FormMessage } from "@/components/ui";
import { buildSchedule } from "@/domain/installments";
import { currencyLabel, formatMoney, parseAmountInput } from "@/domain/money";
import { allocateSettlement, type SaleDue } from "@/domain/settlement";
import type { FormState } from "@/lib/form";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const COUNTS = ["1", "2", "3", "4", "6"];
const INTERVALS = ["7", "14", "30"];

// Échéancier d'une vente : acompte éventuel, puis le reste en parts égales.
export function InstallmentForm({
  action,
  total,
  currency,
  today,
}: {
  action: Action;
  total: number;
  currency: string;
  today: string;
}) {
  const t = useTranslations("money");
  const confirmT = useTranslations("confirm");
  const format = useFormatter();
  const [state, formAction, pending] = useActionState(action, null);
  const [deposit, setDeposit] = useState(state?.values?.deposit ?? "");
  const [count, setCount] = useState(state?.values?.count ?? "2");
  const [interval, setInterval] = useState(state?.values?.interval ?? "30");

  const depositAmount = deposit.trim() === "" ? 0 : parseAmountInput(deposit, currency);
  const schedule =
    depositAmount === null
      ? null
      : buildSchedule({
          total,
          deposit: depositAmount,
          count: Number(count),
          intervalDays: Number(interval),
          today,
        });

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        name="deposit"
        label={t("deposit", { currency: currencyLabel(currency) })}
        hint={t("depositHint")}
        inputMode="numeric"
        className="sm:max-w-md"
        value={deposit}
        onChange={(event) => setDeposit(event.target.value)}
      />
      <ChoiceCards
        legend={t("installmentCount")}
        name="count"
        value={count}
        onChange={setCount}
        columns={4}
        options={COUNTS.map((value) => ({ value, label: value }))}
      />
      <ChoiceCards
        legend={t("interval")}
        name="interval"
        value={interval}
        onChange={setInterval}
        columns={4}
        options={INTERVALS.map((value) => ({
          value,
          label: t("everyDays", { count: Number(value) }),
        }))}
      />

      {schedule ? (
        <ol className="flex flex-col gap-2 rounded-2xl bg-surface-2 p-4 text-sm">
          {schedule.map((installment, index) => (
            <li key={index} className="flex items-center justify-between gap-3">
              <span className="text-muted">
                {installment.paid
                  ? t("depositToday")
                  : format.dateTime(new Date(installment.dueOn), { dateStyle: "long" })}
              </span>
              <span className="font-semibold">{formatMoney(installment.amount, currency)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <FormMessage tone="warning">{t("errors.invalid_schedule")}</FormMessage>
      )}

      {state?.error ? <FormMessage tone="danger">{t(stripPrefix(state.error))}</FormMessage> : null}
      <ConfirmButton
        confirm={{ message: confirmT("schedule") }}
        disabled={pending || !schedule}
        className="w-full sm:w-auto sm:self-start"
      >
        {pending ? t("saving") : t("saveSchedule")}
      </ConfirmButton>
    </form>
  );
}

// Les actions renvoient des clés complètes (« money.errors.x » ou « errors.generic »).
function stripPrefix(key: string) {
  return key.startsWith("money.") ? key.slice("money.".length) : "errors.generic";
}

const METHODS = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER"];

// Règlement d'un dealer : montant, mode de paiement, et éventuellement les
// ventes à solder en premier.
export function SettlementForm({
  action,
  dues,
  labels,
  currency,
}: {
  action: Action;
  dues: SaleDue[];
  // Libellé de chaque vente, par identifiant.
  labels: Record<string, string>;
  currency: string;
}) {
  const t = useTranslations("money");
  const confirmT = useTranslations("confirm");
  const [state, formAction, pending] = useActionState(action, null);
  const balance = dues.reduce((sum, d) => sum + d.due, 0);
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState("CASH");
  const [selected, setSelected] = useState<string[]>([]);
  const money = (value: number) => formatMoney(value, currency);

  const parsed = parseAmountInput(amount, currency);
  const allocations = parsed === null ? null : allocateSettlement(parsed, dues, selected);
  const covered = new Map((allocations ?? []).map((a) => [a.saleId, a.amount]));
  const settledCount = dues.filter((d) => covered.get(d.saleId) === d.due).length;

  if (balance === 0) return null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        name="amount"
        label={t("amount", { currency: currencyLabel(currency) })}
        hint={t("amountHint", { balance: money(balance) })}
        inputMode="numeric"
        className="sm:max-w-md"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />
      <ChoiceCards
        legend={t("method")}
        name="method"
        value={method}
        onChange={setMethod}
        options={METHODS.map((value) => ({ value, label: t(`methods.${value}`) }))}
      />

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-fg">{t("salesToSettle")}</legend>
        <p className="mb-2 text-sm text-muted">{t("salesToSettleHint")}</p>
        <ul className="flex flex-col gap-2">
          {dues.map((due) => (
            <li key={due.saleId}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface p-3 has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary">
                <input
                  type="checkbox"
                  name="sale_ids"
                  value={due.saleId}
                  checked={selected.includes(due.saleId)}
                  onChange={() =>
                    setSelected((current) =>
                      current.includes(due.saleId)
                        ? current.filter((id) => id !== due.saleId)
                        : [...current, due.saleId],
                    )
                  }
                  className="size-4 shrink-0 accent-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{labels[due.saleId]}</span>
                  <span className="block text-sm text-muted">
                    {t("dueOnSale", { due: money(due.due) })}
                  </span>
                </span>
                {covered.has(due.saleId) ? (
                  <span className="shrink-0 text-sm font-semibold text-success">
                    − {money(covered.get(due.saleId)!)}
                  </span>
                ) : null}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      {allocations && parsed !== null ? (
        <p className="rounded-2xl bg-surface-2 p-4 text-sm">
          {t("settlementPreview", {
            count: settledCount,
            remaining: money(balance - parsed),
          })}
        </p>
      ) : (
        <FormMessage tone="warning">{t("errors.amount_exceeds_balance")}</FormMessage>
      )}

      {state?.error ? <FormMessage tone="danger">{t(stripPrefix(state.error))}</FormMessage> : null}
      <ConfirmButton
        confirm={{ message: confirmT("settlement") }}
        disabled={pending || !allocations}
        className="w-full sm:w-auto sm:self-start"
      >
        {pending ? t("saving") : t("recordSettlement")}
      </ConfirmButton>
    </form>
  );
}
