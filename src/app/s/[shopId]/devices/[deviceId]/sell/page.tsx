import { shopDeviceScope } from "@/features/devices/scope";
import { SellDevicePage } from "@/features/sales/pages";

export default async function ShopSellDevicePage({ params }: PageProps<"/s/[shopId]/devices/[deviceId]/sell">) {
  const { shopId, deviceId } = await params;
  const { supabase, profile, scope } = await shopDeviceScope(shopId);
  return (
    <SellDevicePage supabase={supabase} scope={scope} userId={profile.id} deviceId={deviceId} />
  );
}
