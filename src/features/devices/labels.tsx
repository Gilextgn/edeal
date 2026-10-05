import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";
import { CAPACITIES, COLORS, isKnown } from "@/domain/catalog";
import type { Database } from "@/lib/database.types";

type DeviceStatus = Database["public"]["Enums"]["device_status"];

const statusTones = {
  IN_STOCK: "primary",
  CONSIGNED: "warning",
  SOLD: "success",
  WITHDRAWN: "neutral",
} as const;

export function StatusBadge({ status }: { status: DeviceStatus }) {
  const t = useTranslations("devices.status");
  return <Badge tone={statusTones[status]}>{t(status)}</Badge>;
}

// « 128 Go · Noir ». Une valeur hors catalogue est affichée telle quelle.
export function Variant({ capacity, color }: { capacity: string; color: string }) {
  const t = useTranslations("catalog");
  return (
    <>
      {isKnown(CAPACITIES, capacity) ? t(`capacity.${capacity}`) : capacity}
      {" · "}
      {isKnown(COLORS, color) ? t(`color.${color}`) : color}
    </>
  );
}
