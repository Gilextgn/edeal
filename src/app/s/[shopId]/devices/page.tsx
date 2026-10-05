import { parsePage, parseSearch } from "@/domain/pagination";
import { DeviceList } from "@/features/devices/device-list";
import { shopDeviceScope } from "@/features/devices/scope";

export default async function ShopDevicesPage({
  params,
  searchParams,
}: PageProps<"/s/[shopId]/devices">) {
  const { shopId } = await params;
  const { page, q, notice } = await searchParams;
  const { supabase, profile, scope } = await shopDeviceScope(shopId);
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
