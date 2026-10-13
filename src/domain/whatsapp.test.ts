import { describe, expect, it } from "vitest";
import { receiptNumber, warrantyEnd, whatsappUrl } from "./whatsapp";

describe("whatsappUrl", () => {
  it("ouvre la conversation du client quand son numéro est connu", () => {
    expect(whatsappUrl("Bonjour", "97 11 22 33", "229")).toBe(
      "https://wa.me/2290197112233?text=Bonjour",
    );
    expect(whatsappUrl("Bonjour", "+221 77 123 45 67", "229")).toBe(
      "https://wa.me/221771234567?text=Bonjour",
    );
  });

  it("laisse choisir le destinataire sans numéro ou avec un numéro invalide", () => {
    expect(whatsappUrl("Bonjour", null, "229")).toBe("https://wa.me/?text=Bonjour");
    expect(whatsappUrl("Bonjour", "", "229")).toBe("https://wa.me/?text=Bonjour");
    expect(whatsappUrl("Bonjour", "abc", "229")).toBe("https://wa.me/?text=Bonjour");
    expect(whatsappUrl("Bonjour", "client@exemple.com", "229")).toBe(
      "https://wa.me/?text=Bonjour",
    );
  });

  it("encode les sauts de ligne, accents et caractères spéciaux", () => {
    const url = whatsappUrl("Reçu n° 1\nPrix : 250 000 F CFA & garantie", null, "229");
    expect(url).toBe(
      "https://wa.me/?text=Re%C3%A7u%20n%C2%B0%201%0APrix%20%3A%20250%20000%20F%20CFA%20%26%20garantie",
    );
    expect(decodeURIComponent(url.split("text=")[1])).toBe(
      "Reçu n° 1\nPrix : 250 000 F CFA & garantie",
    );
  });
});

describe("receiptNumber", () => {
  it("donne un numéro court et lisible", () => {
    expect(receiptNumber("3f2a91bc-0d4e-4a1b-9c2d-5e6f7a8b9c0d")).toBe("3F2A-91BC");
  });
});

describe("warrantyEnd", () => {
  it("ajoute la durée de garantie à la date de vente", () => {
    expect(warrantyEnd("2026-10-05T13:50:00Z", 30)).toBe("2026-11-04");
    expect(warrantyEnd("2026-12-20T08:00:00Z", 90)).toBe("2027-03-20");
  });

  it("vaut null sans garantie", () => {
    expect(warrantyEnd("2026-10-05T13:50:00Z", 0)).toBeNull();
  });
});
