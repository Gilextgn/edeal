import { describe, expect, it } from "vitest";
import { extractImeis, imeiCheckDigit, isValidImei, normalizeImei } from "./imei";

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

describe("extractImeis (lecture d'une photo)", () => {
  it("lit l'IMEI de l'écran « À propos » d'un iPhone", () => {
    const text = [
      "Nom du modèle iPhone 13",
      "Numéro de série F2LXK0ABCD12",
      "IMEI 35 693803 564380 9",
      "ICCID 8933 0123 4567 8901 2345",
      "MEID 35693803564380",
    ].join("\n");
    expect(extractImeis(text)).toEqual(["356938035643809"]);
  });

  it("lit les deux IMEI d'un téléphone double SIM (écran *#06#)", () => {
    const text = "IMEI1\n490154203237518 / 01\nIMEI2\n356938035643809 / 01\nSN\nR58M12ABCDE";
    expect(extractImeis(text)).toEqual(["490154203237518", "356938035643809"]);
  });

  it("lit le contenu d'un code-barres", () => {
    expect(extractImeis("490154203237518")).toEqual(["490154203237518"]);
  });

  it("lit deux IMEI collés sur une même ligne", () => {
    expect(extractImeis("490154203237518356938035643809")).toEqual([
      "490154203237518",
      "356938035643809",
    ]);
  });

  it("ignore les suites dont la clé de Luhn est fausse", () => {
    expect(extractImeis("IMEI 35 693803 564380 8")).toEqual([]);
    expect(extractImeis("123456789012345")).toEqual([]);
  });

  it("ignore numéros de téléphone, prix et numéros trop longs", () => {
    expect(extractImeis("Tel 97 00 00 00\nPrix 250 000 F CFA\n8933012345678901234")).toEqual([]);
    expect(extractImeis("")).toEqual([]);
  });

  it("ne renvoie pas deux fois le même IMEI", () => {
    expect(extractImeis("490154203237518\nIMEI 49 015420 323751 8")).toEqual(["490154203237518"]);
  });
});
