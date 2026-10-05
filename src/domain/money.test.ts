import { describe, expect, it } from "vitest";
import {
  amountToInput,
  currencyFractionDigits,
  formatMoney,
  parseAmountInput,
} from "./money";

describe("currencyFractionDigits", () => {
  it("connaît les décimales de la devise", () => {
    expect(currencyFractionDigits("XOF")).toBe(0);
    expect(currencyFractionDigits("EUR")).toBe(2);
  });
});

describe("parseAmountInput", () => {
  it("lit un montant en FCFA, avec ou sans espaces", () => {
    expect(parseAmountInput("150000", "XOF")).toBe(150000);
    expect(parseAmountInput("150 000", "XOF")).toBe(150000);
    expect(parseAmountInput(" 1 250 000 ", "XOF")).toBe(1250000);
    expect(parseAmountInput("0", "XOF")).toBe(0);
  });

  it("refuse des décimales pour une devise qui n'en a pas", () => {
    expect(parseAmountInput("150000,5", "XOF")).toBeNull();
    expect(parseAmountInput("150.000", "XOF")).toBeNull();
  });

  it("convertit en centimes pour une devise à deux décimales", () => {
    expect(parseAmountInput("12", "EUR")).toBe(1200);
    expect(parseAmountInput("12,5", "EUR")).toBe(1250);
    expect(parseAmountInput("12.05", "EUR")).toBe(1205);
    expect(parseAmountInput("0,07", "EUR")).toBe(7);
    expect(parseAmountInput("12,345", "EUR")).toBeNull();
  });

  it("ne produit jamais de flottant", () => {
    expect(parseAmountInput("0,29", "EUR")).toBe(29);
    expect(parseAmountInput("1,15", "EUR")).toBe(115);
    expect(parseAmountInput("4,35", "EUR")).toBe(435);
  });

  it("refuse les saisies invalides", () => {
    for (const raw of ["", "abc", "-500", "12,", "1e5", "150 000 F", "9999999999999"]) {
      expect(parseAmountInput(raw, "XOF"), raw).toBeNull();
    }
  });
});

describe("amountToInput", () => {
  it("est l'inverse de parseAmountInput", () => {
    for (const amount of [0, 5, 150000, 1250000]) {
      expect(parseAmountInput(amountToInput(amount, "XOF"), "XOF")).toBe(amount);
    }
    for (const amount of [0, 7, 115, 1205, 99999]) {
      expect(parseAmountInput(amountToInput(amount, "EUR"), "EUR")).toBe(amount);
    }
  });
});

describe("formatMoney", () => {
  it("affiche un montant en FCFA", () => {
    expect(formatMoney(250000, "XOF").replace(/\s/g, " ")).toBe("250 000 F CFA");
    expect(formatMoney(0, "XOF").replace(/\s/g, " ")).toBe("0 F CFA");
  });

  it("affiche les centimes d'une devise à deux décimales", () => {
    expect(formatMoney(1205, "EUR").replace(/\s/g, " ")).toBe("12,05 €");
  });
});
