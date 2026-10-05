import { loadDevice } from "@/features/devices/device-detail";
import { shopDeviceScope } from "@/features/devices/scope";
import { ListingPage } from "@/features/share/pages";

export default async function ShopListingPage({
  params,
}: PageProps<"/s/[shopId]/devices/[deviceId]/listing">) {
  const { shopId, deviceId } = await params;
  const { supabase, profile, shop, scope } = await shopDeviceScope(shopId);
  const device = await loadDevice(supabase, scope, profile.id, deviceId);
  const base = `${scope.basePath}/${device.id}`;
  return (
    <ListingPage
      supabase={supabase}
      device={device}
      currency={scope.currency}
      contactPhone={shop.phone}
      backHref={base}
      reportHref={scope.canWrite ? `${base}/reports/new` : undefined}
    />
  );
}
