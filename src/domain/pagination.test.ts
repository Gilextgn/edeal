import { describe, expect, it } from "vitest";
import { pageInfo, pageRange, parsePage, parseSearch } from "./pagination";

describe("parsePage", () => {
  it("lit le numéro de page", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["2", "9"])).toBe(2);
  });

  it("revient à la première page si absent ou invalide", () => {
    for (const raw of [undefined, "", "0", "-1", "abc", "1.5", "99999999"]) {
      expect(parsePage(raw), String(raw)).toBe(1);
    }
  });
});

describe("pageRange", () => {
  it("donne les lignes de la page", () => {
    expect(pageRange(1)).toEqual({ from: 0, to: 9 });
    expect(pageRange(3)).toEqual({ from: 20, to: 29 });
    expect(pageRange(2, 25)).toEqual({ from: 25, to: 49 });
  });
});

describe("pageInfo", () => {
  it("décrit une page au milieu de la liste", () => {
    expect(pageInfo(2, 43)).toEqual({ page: 2, pageCount: 5, total: 43, from: 11, to: 20 });
  });

  it("la dernière page peut être incomplète", () => {
    expect(pageInfo(5, 43)).toEqual({ page: 5, pageCount: 5, total: 43, from: 41, to: 43 });
  });

  it("ramène une page trop grande à la dernière", () => {
    expect(pageInfo(9, 43).page).toBe(5);
  });

  it("gère une liste vide", () => {
    expect(pageInfo(1, 0)).toEqual({ page: 1, pageCount: 1, total: 0, from: 0, to: 0 });
  });

  it("une liste qui tient sur une page", () => {
    expect(pageInfo(1, 10)).toEqual({ page: 1, pageCount: 1, total: 10, from: 1, to: 10 });
  });
});

describe("parseSearch", () => {
  it("garde le texte cherché", () => {
    expect(parseSearch(" iPhone 13 ")).toBe("iPhone 13");
    expect(parseSearch("356938")).toBe("356938");
  });

  it("retire les caractères spéciaux des filtres", () => {
    expect(parseSearch("50%_(a,b)")).toBe("50   a b");
    expect(parseSearch(undefined)).toBe("");
  });

  it("limite la longueur", () => {
    expect(parseSearch("a".repeat(200))).toHaveLength(60);
  });
});
