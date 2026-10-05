import { loadDevice } from "@/features/devices/device-detail";
import { personalDeviceScope } from "@/features/devices/scope";
import { ListingPage } from "@/features/share/pages";

export default async function PersonalListingPage({
  params,
}: PageProps<"/perso/devices/[deviceId]/listing">) {
  const { deviceId } = await params;
  const { supabase, profile, scope } = await personalDeviceScope();
  const device = await loadDevice(supabase, scope, profile.id, deviceId);
  const base = `${scope.basePath}/${device.id}`;
  return (
    <ListingPage
      supabase={supabase}
      device={device}
      currency={scope.currency}
      contactPhone={profile.phone ? `+${profile.phone}` : null}
      backHref={base}
      reportHref={`${base}/reports/new`}
    />
  );
}
