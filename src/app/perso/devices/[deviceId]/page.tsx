import { DeviceDetail } from "@/features/devices/device-detail";
import { personalDeviceScope } from "@/features/devices/scope";

export default async function PersonalDevicePage({ params, searchParams }: PageProps<"/perso/devices/[deviceId]">) {
  const { deviceId } = await params;
  const { created } = await searchParams;
  const { supabase, profile, scope } = await personalDeviceScope();
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
