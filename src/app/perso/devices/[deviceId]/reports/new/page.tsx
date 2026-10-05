import { NewReportPage } from "@/features/devices/pages";
import { personalDeviceScope } from "@/features/devices/scope";

export default async function PersonalNewReportPage({ params }: PageProps<"/perso/devices/[deviceId]/reports/new">) {
  const { deviceId } = await params;
  const { supabase, profile, scope } = await personalDeviceScope();
  return (
    <NewReportPage
      supabase={supabase}
      scope={scope}
      userId={profile.id}
      deviceId={deviceId}
    />
  );
}
