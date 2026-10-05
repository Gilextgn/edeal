import { describe, expect, it } from "vitest";
import { imeiCheckDigit, isValidImei, normalizeImei } from "./imei";

describe("isValidImei", () => {
  it("accepte des IMEI dont la clé de Luhn est correcte", () => {
    expect(isValidImei("490154203237518")).toBe(true);
    expect(isValidImei("356938035643809")).toBe(true);
    expect(isValidImei("000000000000000")).toBe(true);
  });

  it("refuse une clé de Luhn incorrecte", () => {
    expect(isValidImei("490154203237517")).toBe(false);
    expect(isValidImei("356938035643808")).toBe(false);
  });

  it("refuse deux chiffres voisins inversés", () => {
    expect(isValidImei("490154203237518")).toBe(true);
    expect(isValidImei("940154203237518")).toBe(false);
  });

  it("refuse une longueur différente de 15", () => {
    expect(isValidImei("49015420323751")).toBe(false);
    expect(isValidImei("4901542032375180")).toBe(false);
    expect(isValidImei("")).toBe(false);
  });

  it("refuse tout caractère non numérique", () => {
    expect(isValidImei("49015420323751a")).toBe(false);
    expect(isValidImei("49 0154203237518")).toBe(false);
    expect(isValidImei("４９０１５４２０３２３７５１８")).toBe(false);
  });
});

describe("imeiCheckDigit", () => {
  it("calcule la clé des 14 premiers chiffres", () => {
    expect(imeiCheckDigit("49015420323751")).toBe(8);
    expect(imeiCheckDigit("35693803564380")).toBe(9);
  });

  it("produit toujours un IMEI valide", () => {
    for (const body of ["12345678901234", "99999999999999", "86012304567890"]) {
      expect(isValidImei(body + imeiCheckDigit(body))).toBe(true);
    }
  });
});

describe("normalizeImei", () => {
  it("retire les séparateurs d'un IMEI copié depuis l'écran « À propos »", () => {
    expect(normalizeImei("49 015420 323751 8")).toBe("490154203237518");
    expect(normalizeImei("49-015420-323751-8")).toBe("490154203237518");
    expect(normalizeImei("35 693803 564380 9")).toBe("356938035643809");
  });
});
