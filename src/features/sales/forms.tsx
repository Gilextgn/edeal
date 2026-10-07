"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChoiceCards } from "@/components/choices";
import { SearchSelect } from "@/components/search-select";
import { ButtonLink, Card, Field, FormMessage } from "@/components/ui";
import { currencyLabel, formatMoney, parseAmountInput } from "@/domain/money";
import { computeShares, needsApproval, type SaleKind } from "@/domain/shares";
import { ReportOperationForm } from "@/features/devices/report-fields";

type Common = { deviceId: string; userId: string; backHref: string };

const DUE_IN_DAYS = ["7", "14", "30"];
const WARRANTY_DAYS = ["0", "7", "30", "90"];

// Date locale du téléphone, dans `days` jours, au format AAAA-MM-JJ.
function dateInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function ConsignForm({
  dealers,
  currency,
  defaultFloor,
  membersHref,
  ...common
}: Common & {
  dealers: { membershipId: string; name: string; rate: string }[];
  currency: string;
  defaultFloor: string;
  membersHref: string;
}) {
  const t = useTranslations("consignments");
  const [dealer, setDealer] = useState(dealers.length === 1 ? dealers[0].membershipId : "");
  const [days, setDays] = useState("14");
  const [floor, setFloor] = useState(defaultFloor);

  if (dealers.length === 0) {
    return (
      <Card className="flex flex-col gap-4">
        <p className="text-muted">{t("noDealers")}</p>
        <ButtonLink href={membersHref} className="w-full sm:w-auto sm:self-start">
          {t("addDealer")}
        </ButtonLink>
      </Card>
    );
  }

  return (
    <ReportOperationForm
      {...common}
      submitLabel={t("submit")}
      build={() => {
        if (!dealer) return { error: t("errors.dealer_required") };
        const floorPrice = parseAmountInput(floor, currency);
        if (floorPrice === null) return { error: t("errors.invalid_price") };
        return {
          rpc: "create_consignment",
          args: {
            p_consignment: {
              id: crypto.randomUUID(),
              device_id: common.deviceId,
              membership_id: dealer,
              due_on: dateInDays(Number(days)),
              floor_price: floorPrice,
            },
          },
        };
      }}
    >
      <Card className="flex flex-col gap-6">
        <ChoiceCards
          legend={t("dealer")}
          name="dealer"
          value={dealer}
          onChange={setDealer}
          options={dealers.map((d) => ({
            value: d.membershipId,
            label: d.name,
            hint: t("dealerRate", { rate: d.rate }),
          }))}
        />
        <ChoiceCards
          legend={t("dueIn")}
          name="days"
          value={days}
          onChange={setDays}
          columns={4}
          options={DUE_IN_DAYS.map((value) => ({
            value,
            label: t("days", { count: Number(value) }),
          }))}
        />
        <Field
          name="floor"
          label={t("floorPrice", { currency: currencyLabel(currency) })}
          hint={t("floorHint")}
          inputMode="numeric"
          className="sm:max-w-md"
          value={floor}
          onChange={(event) => setFloor(event.target.value)}
        />
      </Card>
      <h2 className="mt-2 text-sm font-semibold uppercase tracking-wide text-muted">
        {t("handoverReport")}
      </h2>
    </ReportOperationForm>
  );
}

export function ReturnForm({ consignmentId, ...common }: Common & { consignmentId: string }) {
  const t = useTranslations("consignments");
  return (
    <ReportOperationForm
      {...common}
      submitLabel={t("submitReturn")}
      build={() => ({
        rpc: "return_consignment",
        args: { p_consignment_id: consignmentId },
      })}
    />
  );
}

const NEW_CUSTOMER = "new";

export function SellForm({
  kind,
  currency,
  purchasePrice,
  rateBps,
  floorPrice,
  defaultPrice,
  customers,
  doneHref,
  ...common
}: Common & {
  kind: SaleKind;
  currency: string;
  purchasePrice: number;
  rateBps: number;
  // Prix plancher du dépôt ; absent hors dépôt.
  floorPrice: number | null;
  defaultPrice: string;
  customers: { id: string; name: string; phone: string | null }[];
  doneHref: string;
}) {
  const t = useTranslations("sales");
  const [customer, setCustomer] = useState(NEW_CUSTOMER);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState(defaultPrice);
  const [warranty, setWarranty] = useState("0");

  const salePrice = parseAmountInput(price, currency);
  const shares =
    salePrice === null
      ? null
      : computeShares(kind, { salePrice, purchasePrice, commissionRateBps: rateBps });
  const pending =
    salePrice !== null && floorPrice !== null && needsApproval(salePrice, floorPrice);
  const money = (amount: number) => formatMoney(amount, currency);

  return (
    <ReportOperationForm
      {...common}
      doneHref={doneHref}
      submitLabel={t(pending ? "submitForApproval" : "submit")}
      build={() => {
        if (customer === NEW_CUSTOMER && !name.trim()) {
          return { error: t("errors.customer_required") };
        }
        if (salePrice === null) return { error: t("errors.invalid_price") };
        return {
          rpc: "create_sale",
          args: {
            p_sale: {
              id: crypto.randomUUID(),
              device_id: common.deviceId,
              sale_price: salePrice,
              warranty_days: Number(warranty),
              ...(customer === NEW_CUSTOMER
                ? {
                    customer_id: crypto.randomUUID(),
                    customer_name: name.trim(),
                    customer_phone: phone.trim(),
                  }
                : { customer_id: customer }),
            },
          },
        };
      }}
    >
      <Card className="flex flex-col gap-5">
        {customers.length > 0 ? (
          <SearchSelect
            name="customer"
            label={t("customer")}
            value={customer}
            onChange={setCustomer}
            placeholder={t("newCustomer")}
            searchPlaceholder={t("searchCustomer")}
            emptyLabel={t("noCustomerFound")}
            options={[
              { value: NEW_CUSTOMER, label: t("newCustomer") },
              ...customers.map((c) => ({
                value: c.id,
                label: c.phone ? `${c.name} · ${c.phone}` : c.name,
              })),
            ]}
          />
        ) : null}
        {customer === NEW_CUSTOMER ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              name="customer_name"
              label={t("customerName")}
              autoComplete="off"
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Field
              name="customer_phone"
              type="tel"
              label={t("customerPhone")}
              hint={t("optional")}
              autoComplete="off"
              maxLength={30}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-5">
        <Field
          name="sale_price"
          label={t("price", { currency: currencyLabel(currency) })}
          inputMode="numeric"
          className="sm:max-w-md"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />

        {shares ? (
          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-surface-2 p-4 text-sm">
            {kind === "DIRECT" ? null : (
              <div>
                <dt className="text-muted">{t("yourShare")}</dt>
                <dd className="text-lg font-bold">{pending ? "—" : money(shares.dealerShare)}</dd>
              </div>
            )}
            {kind === "PERSONAL" ? null : (
              <div>
                <dt className="text-muted">{t("shopShare")}</dt>
                <dd className="text-lg font-bold">{pending ? "—" : money(shares.shopShare)}</dd>
              </div>
            )}
          </dl>
        ) : null}
        {pending && floorPrice !== null ? (
          <FormMessage tone="warning">
            {t("belowFloor", { floor: money(floorPrice) })}
          </FormMessage>
        ) : null}

        <ChoiceCards
          legend={t("warranty")}
          name="warranty"
          value={warranty}
          onChange={setWarranty}
          columns={4}
          options={WARRANTY_DAYS.map((value) => ({
            value,
            label: value === "0" ? t("noWarranty") : t("warrantyDays", { count: Number(value) }),
          }))}
        />
      </Card>
      <h2 className="mt-2 text-sm font-semibold uppercase tracking-wide text-muted">
        {t("saleReport")}
      </h2>
    </ReportOperationForm>
  );
}
