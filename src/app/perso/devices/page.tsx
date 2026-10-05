import { DeviceList } from "@/features/devices/device-list";
import { personalDeviceScope } from "@/features/devices/scope";

export default async function PersonalDevicesPage() {
  const { supabase, profile, scope } = await personalDeviceScope();
  return <DeviceList supabase={supabase} scope={scope} userId={profile.id} />;
}
