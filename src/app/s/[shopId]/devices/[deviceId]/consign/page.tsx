import { shopDeviceScope } from "@/features/devices/scope";
import { ConsignPage } from "@/features/sales/pages";

export default async function ShopConsignPage({ params }: PageProps<"/s/[shopId]/devices/[deviceId]/consign">) {
  const { shopId, deviceId } = await params;
  const { supabase, profile, scope } = await shopDeviceScope(shopId);
  return (
    <ConsignPage supabase={supabase} scope={scope} userId={profile.id} deviceId={deviceId} />
  );
}
