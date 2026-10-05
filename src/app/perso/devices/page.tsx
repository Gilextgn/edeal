import { parsePage, parseSearch } from "@/domain/pagination";
import { DeviceList } from "@/features/devices/device-list";
import { personalDeviceScope } from "@/features/devices/scope";

export default async function PersonalDevicesPage({
  searchParams,
}: PageProps<"/perso/devices">) {
  const { page, q, notice } = await searchParams;
  const { supabase, profile, scope } = await personalDeviceScope();
  return (
    <DeviceList
      supabase={supabase}
      scope={scope}
      userId={profile.id}
      page={parsePage(page)}
      search={parseSearch(q)}
      notice={typeof notice === "string" ? notice : undefined}
    />
  );
}
