import { DeviceDetail } from "@/features/devices/device-detail";
import { shopDeviceScope } from "@/features/devices/scope";

export default async function ShopDevicePage({ params, searchParams }: PageProps<"/s/[shopId]/devices/[deviceId]">) {
  const { deviceId } = await params;
  const { created } = await searchParams;
  const { shopId } = await params;
  const { supabase, profile, scope } = await shopDeviceScope(shopId);
  return (
    <DeviceDetail
      supabase={supabase}
      scope={scope}
      userId={profile.id}
      deviceId={deviceId}
      justCreated={created === "1"}
    />
  );
}
