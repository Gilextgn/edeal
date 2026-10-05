import { notFound } from "next/navigation";
import { PERSONAL_CURRENCY } from "@/domain/money";
import { requireShop, requireUser } from "@/lib/session";

// Les mêmes écrans servent au stock d'une boutique et au stock perso.
// Le « scope » dit dans quel espace on se trouve.
export type DeviceScope = {
  shopId: string | null;
  basePath: string;
  currency: string;
  canWrite: boolean;
};

export function devicesPath(shopId: string | null) {
  return shopId ? `/s/${shopId}/devices` : "/perso/devices";
}

// Stock de la boutique : visible du patron et du caissier, modifiable par le patron.
export async function shopDeviceScope(shopId: string) {
  const context = await requireShop(shopId);
  const { role } = context.membership;
  if (role !== "OWNER" && role !== "CASHIER") notFound();

  const scope: DeviceScope = {
    shopId: context.shop.id,
    basePath: devicesPath(context.shop.id),
    currency: context.shop.currency,
    canWrite: role === "OWNER",
  };
  return { ...context, scope };
}

export async function personalDeviceScope() {
  const context = await requireUser();
  const scope: DeviceScope = {
    shopId: null,
    basePath: devicesPath(null),
    currency: PERSONAL_CURRENCY,
    canWrite: true,
  };
  return { ...context, scope };
}

export function requireWritable(scope: DeviceScope) {
  if (!scope.canWrite) notFound();
}
