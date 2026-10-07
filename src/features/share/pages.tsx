import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { CAPACITIES, COLORS, isKnown } from "@/domain/catalog";
import { outstanding } from "@/domain/installments";
import { formatMoney, PERSONAL_CURRENCY } from "@/domain/money";
import { receiptNumber, warrantyEnd, whatsappUrl } from "@/domain/whatsapp";
import { env } from "@/lib/env";
import type { createClient } from "@/lib/supabase/server";
import { CopyButton, PrintButton, SharePhotosButton } from "./buttons";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Translate = Awaited<ReturnType<typeof getTranslations>>;

const UUID = /^[0-9a-f-]{36}$/i;
const SIGNED_URL_SECONDS = 3600;

// « iPhone 13 128 Go Noir »
function deviceName(
  t: Translate,
  device: { model: string; capacity: string; color: string },
) {
  const capacity = isKnown(CAPACITIES, device.capacity)
    ? t(`catalog.capacity.${device.capacity}`)
    : device.capacity;
  const color = isKnown(COLORS, device.color) ? t(`catalog.color.${device.color}`) : device.color;
  return `${device.model} ${capacity} ${color}`;
}

// ---------- Reçu de vente ----------

export async function ReceiptPage({
  supabase,
  shopId,
  userId,
  saleId,
  seller,
  backHref,
  currency = PERSONAL_CURRENCY,
}: {
  supabase: Supabase;
  shopId: string | null;
  userId: string;
  saleId: string;
  // Qui vend : la boutique, ou le dealer pour une vente perso.
  seller: { name: string; phone: string | null; address: string | null };
  backHref: string;
  currency?: string;
}) {
  if (!UUID.test(saleId)) notFound();
  const { data: sale } = await supabase
    .from("sales")
    .select(
      "*, devices(model, capacity, color, imei), customers(name, phone), installments(amount, due_on, paid_on), condition_reports(grade)",
    )
    .eq("id", saleId)
    .maybeSingle();

  const inSpace = shopId
    ? sale?.shop_id === shopId
    : sale?.type === "PERSONAL" && sale.seller_user_id === userId;
  if (!sale || !inSpace || sale.status !== "COMPLETED" || !sale.devices) notFound();

  const t = await getTranslations();
  const format = await getFormatter();
  const money = (amount: number) => formatMoney(amount, currency);
  const day = (date: string) => format.dateTime(new Date(date), { dateStyle: "long" });

  const number = receiptNumber(sale.id);
  const device = deviceName(t, sale.devices);
  const warrantyUntil = warrantyEnd(sale.created_at, sale.warranty_days);
  const installments = [...sale.installments].sort((a, b) => a.due_on.localeCompare(b.due_on));
  const leftToPay = outstanding(installments);

  const message = [
    t("receipt.message.title", { seller: seller.name, number }),
    t("receipt.message.date", { date: day(sale.created_at) }),
    "",
    t("receipt.message.device", { device }),
    t("receipt.message.imei", { imei: sale.devices.imei }),
    t("receipt.message.price", { price: money(sale.sale_price) }),
    warrantyUntil
      ? t("receipt.message.warranty", { date: day(warrantyUntil) })
      : t("receipt.message.noWarranty"),
    ...(leftToPay > 0 ? [t("receipt.message.leftToPay", { amount: money(leftToPay) })] : []),
    "",
    t("receipt.message.thanks"),
  ].join("\n");

  return (
    <div className="lg:max-w-2xl">
      <div className="print:hidden">
        <PageHeader title={t("receipt.title")} subtitle={t("receipt.subtitle")} />
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <ButtonLink
            href={whatsappUrl(
              message,
              sale.customers?.phone,
              env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE,
            )}
            target="_blank"
            rel="noreferrer"
          >
            {t("receipt.sendWhatsapp")}
          </ButtonLink>
          <PrintButton>{t("receipt.print")}</PrintButton>
          <ButtonLink href={backHref} variant="secondary">
            {t("common.back")}
          </ButtonLink>
        </div>
      </div>

      <Card className="flex flex-col gap-5 print:border-0 print:p-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xl font-bold">{seller.name}</p>
            {seller.address ? <p className="text-sm text-muted">{seller.address}</p> : null}
            {seller.phone ? <p className="text-sm text-muted">{seller.phone}</p> : null}
          </div>
          <div className="text-right">
            <p className="font-semibold">{t("receipt.number", { number })}</p>
            <p className="text-sm text-muted">{day(sale.created_at)}</p>
          </div>
        </div>

        <dl className="grid gap-x-6 gap-y-3 border-y border-border py-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">{t("sales.customer")}</dt>
            <dd className="font-medium">{sale.customers?.name}</dd>
            {sale.customers?.phone ? <dd className="text-muted">{sale.customers.phone}</dd> : null}
          </div>
          <div>
            <dt className="text-muted">{t("receipt.device")}</dt>
            <dd className="font-medium">{device}</dd>
            <dd className="font-mono text-xs text-muted">
              {t("devices.imei")} {sale.devices.imei}
            </dd>
          </div>
          {sale.condition_reports ? (
            <div>
              <dt className="text-muted">{t("reports.grade")}</dt>
              <dd className="font-medium">{t(`reports.grades.${sale.condition_reports.grade}`)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted">{t("sales.warranty")}</dt>
            <dd className="font-medium">
              {warrantyUntil
                ? t("receipt.warrantyUntil", { date: day(warrantyUntil) })
                : t("sales.noWarranty")}
            </dd>
          </div>
        </dl>

        <div className="flex items-baseline justify-between gap-4">
          <p className="font-semibold">{t("sales.priceLabel")}</p>
          <p className="text-2xl font-bold tracking-tight">{money(sale.sale_price)}</p>
        </div>

        {installments.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-semibold">{t("receipt.schedule")}</p>
            <ul className="flex flex-col gap-1 text-sm">
              {installments.map((installment, index) => (
                <li key={index} className="flex justify-between gap-4">
                  <span className="text-muted">
                    {installment.paid_on
                      ? t("money.paidOn", { date: day(installment.paid_on) })
                      : t("money.dueOn", { date: day(installment.due_on) })}
                  </span>
                  <span className="font-medium">{money(installment.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between gap-4 border-t border-border pt-2 text-sm font-semibold">
              <span>{t("receipt.leftToPay")}</span>
              <span>{money(leftToPay)}</span>
            </p>
          </div>
        ) : null}

        <p className="text-center text-xs text-muted">{t("receipt.footer")}</p>
      </Card>
    </div>
  );
}

// ---------- Annonce générée depuis le dernier constat ----------

export async function ListingPage({
  supabase,
  device,
  currency,
  contactPhone,
  backHref,
  reportHref,
}: {
  supabase: Supabase;
  device: {
    id: string;
    model: string;
    capacity: string;
    color: string;
    target_price: number;
  };
  currency: string;
  contactPhone: string | null;
  backHref: string;
  // Où créer un constat s'il n'y en a pas encore (absent si l'utilisateur ne le peut pas).
  reportHref?: string;
}) {
  const t = await getTranslations();

  // Le plus récent constat que l'utilisateur a le droit de lire.
  const { data: report } = await supabase
    .from("condition_reports")
    .select("*, photos(id, angle, storage_key)")
    .eq("device_id", device.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report) {
    return (
      <div className="lg:max-w-2xl">
        <PageHeader title={t("listing.title")} />
        <Card className="flex flex-col gap-4">
          <p className="text-muted">{t("listing.needsReport")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {reportHref ? <ButtonLink href={reportHref}>{t("reports.add")}</ButtonLink> : null}
            <ButtonLink href={backHref} variant="secondary">
              {t("common.back")}
            </ButtonLink>
          </div>
        </Card>
      </div>
    );
  }

  const broken = (["face_id_ok", "cameras_ok", "speakers_ok", "charging_ok"] as const).filter(
    (check) => !report[check],
  );
  const text = [
    t("listing.text.title", { device: deviceName(t, device) }),
    "",
    t("listing.text.grade", { grade: t(`reports.grades.${report.grade}`) }),
    t("listing.text.screen", { state: t(`reports.screens.${report.screen_condition}`) }),
    t("listing.text.body", { state: t(`reports.bodies.${report.body_condition}`) }),
    ...(report.battery_health === null
      ? []
      : [t("listing.text.battery", { value: report.battery_health })]),
    broken.length === 0
      ? t("listing.text.allWorking")
      : t("listing.text.notWorking", {
          items: broken.map((check) => t(`reports.checks.${check}`)).join(", "),
        }),
    t(report.icloud_unlocked ? "listing.text.icloudFree" : "listing.text.icloudLocked"),
    ...(report.past_repairs.length === 0
      ? [t("listing.text.neverRepaired")]
      : [
          t("listing.text.repairs", {
            items: report.past_repairs.map((r) => t(`reports.repairOptions.${r}`)).join(", "),
          }),
        ]),
    ...(report.accessories.length === 0
      ? []
      : [
          t("listing.text.accessories", {
            items: report.accessories.map((a) => t(`reports.accessoryOptions.${a}`)).join(", "),
          }),
        ]),
    "",
    t("listing.text.price", { price: formatMoney(device.target_price, currency) }),
    ...(contactPhone ? [t("listing.text.contact", { phone: contactPhone })] : []),
  ].join("\n");

  // Photos de présentation : sans l'écran « À propos », qui montre l'IMEI.
  const shown = report.photos.filter((photo) => photo.angle !== "ABOUT");
  const { data: signed } = shown.length
    ? await supabase.storage
        .from("photos")
        .createSignedUrls(
          shown.map((photo) => photo.storage_key),
          SIGNED_URL_SECONDS,
        )
    : { data: [] };
  const photos = shown.flatMap((photo) => {
    const url = signed?.find((s) => s.path === photo.storage_key)?.signedUrl;
    return url ? [{ url, name: t(`reports.angles.${photo.angle}`) }] : [];
  });

  return (
    <div className="lg:max-w-2xl">
      <PageHeader title={t("listing.title")} subtitle={t("listing.subtitle")} />
      <Card className="flex flex-col gap-4">
        <p className="whitespace-pre-line rounded-2xl bg-surface-2 p-4 text-sm">{text}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <SharePhotosButton text={text} photos={photos}>
            {t("listing.share")}
          </SharePhotosButton>
          <ButtonLink
            href={whatsappUrl(text, null, env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE)}
            target="_blank"
            rel="noreferrer"
            variant="secondary"
          >
            {t("listing.whatsapp")}
          </ButtonLink>
          <CopyButton text={text} label={t("listing.copy")} copiedLabel={t("listing.copied")} />
          <ButtonLink href={backHref} variant="secondary">
            {t("common.back")}
          </ButtonLink>
        </div>

        {photos.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-semibold">{t("listing.photos")}</p>
            <p className="mb-3 text-sm text-muted">{t("listing.photosHint")}</p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((photo) => (
                <li key={photo.url}>
                  <a href={photo.url} target="_blank" rel="noreferrer" download>
                    {/* Lien signé temporaire : pas d'optimisation d'image possible. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.name}
                      loading="lazy"
                      className="aspect-square w-full rounded-lg border border-border object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
