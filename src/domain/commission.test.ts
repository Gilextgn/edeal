import { describe, expect, it } from "vitest";
import { bpsToPercentInput, percentInputToBps } from "./commission";

describe("percentInputToBps", () => {
  it("convertit un pourcentage entier", () => {
    expect(percentInputToBps("25")).toBe(2500);
    expect(percentInputToBps("0")).toBe(0);
    expect(percentInputToBps("100")).toBe(10000);
  });

  it("accepte la virgule et le point, jusqu'à deux décimales", () => {
    expect(percentInputToBps("12,5")).toBe(1250);
    expect(percentInputToBps("12.5")).toBe(1250);
    expect(percentInputToBps("12.75")).toBe(1275);
    expect(percentInputToBps("0,05")).toBe(5);
    expect(percentInputToBps(" 33,33 ")).toBe(3333);
  });

  it("refuse les valeurs hors de 0–100 %", () => {
    expect(percentInputToBps("100,01")).toBeNull();
    expect(percentInputToBps("150")).toBeNull();
    expect(percentInputToBps("-5")).toBeNull();
  });

  it("refuse les saisies invalides", () => {
    expect(percentInputToBps("")).toBeNull();
    expect(percentInputToBps("abc")).toBeNull();
    expect(percentInputToBps("12,555")).toBeNull();
    expect(percentInputToBps("12,")).toBeNull();
    expect(percentInputToBps("25%")).toBeNull();
  });
});

describe("bpsToPercentInput", () => {
  it("affiche le taux sans décimales inutiles", () => {
    expect(bpsToPercentInput(2500)).toBe("25");
    expect(bpsToPercentInput(1250)).toBe("12.5");
    expect(bpsToPercentInput(1275)).toBe("12.75");
    expect(bpsToPercentInput(5)).toBe("0.05");
    expect(bpsToPercentInput(0)).toBe("0");
  });

  it("est l'inverse de percentInputToBps", () => {
    for (const bps of [0, 5, 50, 1250, 3333, 9999, 10000]) {
      expect(percentInputToBps(bpsToPercentInput(bps))).toBe(bps);
    }
  });
});
