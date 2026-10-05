import { NewDevicePage } from "@/features/devices/pages";
import { shopDeviceScope } from "@/features/devices/scope";

export default async function ShopNewDevicePage({ params }: PageProps<"/s/[shopId]/devices/new">) {
  const { shopId } = await params;
  const { scope } = await shopDeviceScope(shopId);
  return <NewDevicePage scope={scope} />;
}
