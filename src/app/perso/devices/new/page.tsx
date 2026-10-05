import { NewDevicePage } from "@/features/devices/pages";
import { personalDeviceScope } from "@/features/devices/scope";

export default async function PersonalNewDevicePage() {
  const { scope } = await personalDeviceScope();
  return <NewDevicePage scope={scope} />;
}
