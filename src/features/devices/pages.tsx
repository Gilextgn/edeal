import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { amountToInput } from "@/domain/money";
import type { createClient } from "@/lib/supabase/server";
import { createDevice, updateDevice } from "./actions";
import { loadDevice } from "./device-detail";
import { DeviceForm } from "./device-form";
import { ReportForm } from "./report-form";
import { requireWritable, type DeviceScope } from "./scope";

// Corps des écrans d'appareil, partagés entre l'espace boutique et l'espace perso.

type Context = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  scope: DeviceScope;
  userId: string;
};

export async function NewDevicePage({ scope }: { scope: DeviceScope }) {
  requireWritable(scope);
  const t = await getTranslations("devices");

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title={t("newTitle")} subtitle={t("newSubtitle")} />
      <Card>
        <DeviceForm
          action={createDevice.bind(null, scope.shopId)}
          currency={scope.currency}
          cancelHref={scope.basePath}
        />
      </Card>
    </div>
  );
}

export async function EditDevicePage({
  supabase,
  scope,
  userId,
  deviceId,
}: Context & { deviceId: string }) {
  requireWritable(scope);
  const device = await loadDevice(supabase, scope, userId, deviceId);
  const t = await getTranslations("devices");

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title={t("editTitle")} subtitle={`${t("imei")} ${device.imei}`} />
      <Card>
        <DeviceForm
          action={updateDevice.bind(null, scope.shopId, device.id)}
          currency={scope.currency}
          cancelHref={`${scope.basePath}/${device.id}`}
          initial={{
            model: device.model,
            capacity: device.capacity,
            color: device.color,
            purchase_price: amountToInput(device.purchase_price, scope.currency),
            target_price: amountToInput(device.target_price, scope.currency),
          }}
        />
      </Card>
    </div>
  );
}

export async function NewReportPage({
  supabase,
  scope,
  userId,
  deviceId,
}: Context & { deviceId: string }) {
  requireWritable(scope);
  const device = await loadDevice(supabase, scope, userId, deviceId);
  const t = await getTranslations("reports");

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title={t("newTitle")}
        subtitle={t("newSubtitle", { model: device.model, imei: device.imei })}
      />
      <ReportForm
        deviceId={device.id}
        userId={userId}
        backHref={`${scope.basePath}/${device.id}`}
      />
    </div>
  );
}
