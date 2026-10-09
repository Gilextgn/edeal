import Link from "next/link";
import type { ReactNode } from "react";
import { icons } from "@/components/icons";
import { focusRing } from "@/components/ui";
import type { createClient } from "@/lib/supabase/server";

const SIGNED_URL_SECONDS = 3600;

// Angle montré en vignette, par ordre de préférence.
const COVER_ANGLES = ["BACK", "FRONT", "SCREEN_ON"];

/**
 * Photo de vignette de chaque appareil : tirée de son constat le plus récent.
 * Renvoie un lien signé temporaire par appareil ; un appareil sans constat
 * (ou dont l'utilisateur ne peut pas lire les constats) n'a pas d'entrée.
 */
export async function loadDeviceCovers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  deviceIds: string[],
): Promise<Map<string, string>> {
  if (deviceIds.length === 0) return new Map();

  const { data: reports } = await supabase
    .from("condition_reports")
    .select("device_id, photos(angle, storage_key)")
    .in("device_id", deviceIds)
    .order("created_at", { ascending: false });

  const keyOf = new Map<string, string>();
  for (const report of reports ?? []) {
    if (keyOf.has(report.device_id)) continue;
    const photo =
      COVER_ANGLES.map((angle) => report.photos.find((p) => p.angle === angle)).find(Boolean) ??
      report.photos[0];
    if (photo) keyOf.set(report.device_id, photo.storage_key);
  }
  if (keyOf.size === 0) return new Map();

  const { data: signed } = await supabase.storage
    .from("photos")
    .createSignedUrls([...keyOf.values()], SIGNED_URL_SECONDS);
  const urlOf = new Map((signed ?? []).map((entry) => [entry.path, entry.signedUrl]));

  const covers = new Map<string, string>();
  for (const [deviceId, key] of keyOf) {
    const url = urlOf.get(key);
    if (url) covers.set(deviceId, url);
  }
  return covers;
}

// Carte d'un appareil, façon fiche produit : photo, modèle, variante, prix et
// un bouton rond. Toute la carte mène à la fiche.
export function DeviceCard({
  href,
  model,
  variant,
  price,
  cover,
  badge,
}: {
  href: string;
  model: string;
  variant: ReactNode;
  price: string;
  cover?: string;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex h-full flex-col overflow-hidden rounded-3xl bg-surface shadow-card transition hover:-translate-y-0.5 ${focusRing}`}
    >
      <div className="relative aspect-[4/3] bg-surface-2">
        {cover ? (
          // Lien signé temporaire : pas d'optimisation d'image possible.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-primary/40 [&>svg]:size-12"
          >
            {icons.phone}
          </span>
        )}
        {badge ? <span className="absolute left-2 top-2">{badge}</span> : null}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="truncate font-bold">{model}</p>
        <p className="truncate text-xs text-muted">{variant}</p>
        <div className="mt-auto flex items-center justify-between gap-1 pt-3">
          <p className="text-[13px] font-extrabold tracking-tight whitespace-nowrap">{price}</p>
          <span
            aria-hidden
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary"
          >
            {icons.chevron}
          </span>
        </div>
      </div>
    </Link>
  );
}
