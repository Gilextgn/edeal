// Règles d'un constat d'état. Les mêmes listes sont imposées par la base
// (voir supabase/migrations) ; les libellés sont dans messages/fr.json.

export const GRADES = ["NEW", "LIKE_NEW", "GOOD", "FAIR"] as const;
export const SCREEN_CONDITIONS = ["PERFECT", "LIGHT_SCRATCHES", "SCRATCHED", "CRACKED"] as const;
export const BODY_CONDITIONS = ["PERFECT", "LIGHT_WEAR", "DENTED", "DAMAGED"] as const;
export const FUNCTION_CHECKS = ["face_id_ok", "cameras_ok", "speakers_ok", "charging_ok"] as const;
export const REPAIRS = ["SCREEN", "BATTERY", "BACK_GLASS", "CAMERA", "OTHER"] as const;
export const ACCESSORIES = ["BOX", "CABLE", "CHARGER", "EARPHONES", "CASE"] as const;

// Photos exigées pour tout constat, puis photos facultatives.
export const REQUIRED_ANGLES = ["FRONT", "BACK", "SCREEN_ON", "ABOUT"] as const;
export const OPTIONAL_ANGLES = ["SIDES", "DEFECT"] as const;
export const MAX_PHOTOS = 12;

export type PhotoAngle = (typeof REQUIRED_ANGLES)[number] | (typeof OPTIONAL_ANGLES)[number];

export function missingRequiredAngles(angles: readonly string[]): PhotoAngle[] {
  return REQUIRED_ANGLES.filter((angle) => !angles.includes(angle));
}

/** Emplacement d'une photo dans le stockage : <appareil>/<constat>/<photo>. */
export function photoStorageKey(deviceId: string, reportId: string, photoId: string) {
  return `${deviceId}/${reportId}/${photoId}`;
}

/**
 * Santé de batterie saisie en pourcentage. Chaîne vide = inconnue (appareil
 * neuf sous blister) → null. Saisie invalide → undefined.
 */
export function parseBatteryHealth(raw: string): number | null | undefined {
  const value = raw.trim().replace(/%$/, "").trim();
  if (value === "") return null;
  if (!/^\d{1,3}$/.test(value)) return undefined;
  const health = Number(value);
  return health <= 100 ? health : undefined;
}

/** Dimensions d'une image réduite pour tenir dans un carré, sans l'agrandir. */
export function fitWithin(width: number, height: number, max: number) {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  return {
    width: Math.max(1, Math.round((width * max) / longest)),
    height: Math.max(1, Math.round((height * max) / longest)),
  };
}
