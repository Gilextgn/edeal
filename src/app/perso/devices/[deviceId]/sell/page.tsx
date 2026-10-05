import { personalDeviceScope } from "@/features/devices/scope";
import { SellDevicePage } from "@/features/sales/pages";

export default async function PersonalSellDevicePage({ params }: PageProps<"/perso/devices/[deviceId]/sell">) {
  const { deviceId } = await params;
  const { supabase, profile, scope } = await personalDeviceScope();
  return (
    <SellDevicePage supabase={supabase} scope={scope} userId={profile.id} deviceId={deviceId} />
  );
}
