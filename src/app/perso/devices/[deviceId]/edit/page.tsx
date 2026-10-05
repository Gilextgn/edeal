import { EditDevicePage } from "@/features/devices/pages";
import { personalDeviceScope } from "@/features/devices/scope";

export default async function PersonalEditDevicePage({ params }: PageProps<"/perso/devices/[deviceId]/edit">) {
  const { deviceId } = await params;
  const { supabase, profile, scope } = await personalDeviceScope();
  return (
    <EditDevicePage
      supabase={supabase}
      scope={scope}
      userId={profile.id}
      deviceId={deviceId}
    />
  );
}
