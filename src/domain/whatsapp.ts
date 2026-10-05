import { parseIdentifier } from "./identifier";

/**
 * Lien qui ouvre WhatsApp avec un message prêt à envoyer.
 * Avec un numéro valide, la conversation avec ce contact s'ouvre directement ;
 * sinon WhatsApp demande de choisir le destinataire.
 */
export function whatsappUrl(
  text: string,
  phone: string | null | undefined,
  defaultCountryCode: string,
): string {
  const parsed = phone ? parseIdentifier(phone, defaultCountryCode) : null;
  const recipient = parsed?.kind === "phone" ? parsed.phone.slice(1) : "";
  return `https://wa.me/${recipient}?text=${encodeURIComponent(text)}`;
}

/** Numéro de reçu lisible, tiré de l'identifiant de la vente : « 3F2A-91BC ». */
export function receiptNumber(saleId: string): string {
  const compact = saleId.replace(/-/g, "").toUpperCase();
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}`;
}

/** Date de fin de garantie (AAAA-MM-JJ), ou null sans garantie. */
export function warrantyEnd(soldAt: string, warrantyDays: number): string | null {
  if (warrantyDays <= 0) return null;
  const end = new Date(soldAt);
  end.setUTCDate(end.getUTCDate() + warrantyDays);
  return end.toISOString().slice(0, 10);
}
