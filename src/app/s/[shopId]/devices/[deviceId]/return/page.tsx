import { shopDeviceScope } from "@/features/devices/scope";
import { ReturnPage } from "@/features/sales/pages";

export default async function ShopReturnPage({ params }: PageProps<"/s/[shopId]/devices/[deviceId]/return">) {
  const { shopId, deviceId } = await params;
  const { supabase, profile, scope } = await shopDeviceScope(shopId);
  return (
    <ReturnPage supabase={supabase} scope={scope} userId={profile.id} deviceId={deviceId} />
  );
}
