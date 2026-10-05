import { EditDevicePage } from "@/features/devices/pages";
import { shopDeviceScope } from "@/features/devices/scope";

export default async function ShopEditDevicePage({ params }: PageProps<"/s/[shopId]/devices/[deviceId]/edit">) {
  const { deviceId } = await params;
  const { shopId } = await params;
  const { supabase, profile, scope } = await shopDeviceScope(shopId);
  return (
    <EditDevicePage
      supabase={supabase}
      scope={scope}
      userId={profile.id}
      deviceId={deviceId}
    />
  );
}
