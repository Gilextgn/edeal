import { NewReportPage } from "@/features/devices/pages";
import { shopDeviceScope } from "@/features/devices/scope";

export default async function ShopNewReportPage({ params }: PageProps<"/s/[shopId]/devices/[deviceId]/reports/new">) {
  const { deviceId } = await params;
  const { shopId } = await params;
  const { supabase, profile, scope } = await shopDeviceScope(shopId);
  return (
    <NewReportPage
      supabase={supabase}
      scope={scope}
      userId={profile.id}
      deviceId={deviceId}
    />
  );
}
