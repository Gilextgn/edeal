import { DeviceList } from "@/features/devices/device-list";
import { shopDeviceScope } from "@/features/devices/scope";

export default async function ShopDevicesPage({ params }: PageProps<"/s/[shopId]/devices">) {
  const { shopId } = await params;
  const { supabase, profile, scope } = await shopDeviceScope(shopId);
  return <DeviceList supabase={supabase} scope={scope} userId={profile.id} />;
}
