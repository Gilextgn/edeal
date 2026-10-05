import { describe, expect, it } from "vitest";
import { computeShares, marginCommission, needsApproval } from "./shares";
import { CONSIGNMENT_CASES } from "./shares.cases";

describe("vente en dépôt (commission sur la marge)", () => {
  it.each(CONSIGNMENT_CASES)(
    "vente %i, achat %i, taux %i pb → part du dealer %i",
    (salePrice, purchasePrice, commissionRateBps, expected) => {
      const shares = computeShares("CONSIGNMENT", {
        salePrice,
        purchasePrice,
        commissionRateBps,
      });
      expect(shares).toEqual({ dealerShare: expected, shopShare: salePrice - expected });
    },
  );

  it("applique la règle : part du dealer = taux × marge, part boutique = prix − part du dealer", () => {
    expect(
      computeShares("CONSIGNMENT", {
        salePrice: 250_000,
        purchasePrice: 200_000,
        commissionRateBps: 2500,
      }),
    ).toEqual({ dealerShare: 12_500, shopShare: 237_500 });
  });

  it("les deux parts se partagent toujours exactement le prix de vente", () => {
    for (let salePrice = 199_990; salePrice <= 200_050; salePrice++) {
      for (const commissionRateBps of [0, 1, 1250, 3333, 5000, 9999, 10_000]) {
        const { dealerShare, shopShare } = computeShares("CONSIGNMENT", {
          salePrice,
          purchasePrice: 200_000,
          commissionRateBps,
        });
        expect(dealerShare + shopShare).toBe(salePrice);
        expect(Number.isInteger(dealerShare)).toBe(true);
        expect(dealerShare).toBeGreaterThanOrEqual(0);
        expect(shopShare).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("à perte, la boutique reçoit tout le prix de vente", () => {
    expect(
      computeShares("CONSIGNMENT", {
        salePrice: 150_000,
        purchasePrice: 200_000,
        commissionRateBps: 5000,
      }),
    ).toEqual({ dealerShare: 0, shopShare: 150_000 });
  });

  it("la part du dealer ne diminue jamais quand le prix de vente augmente", () => {
    let previous = 0;
    for (let salePrice = 190_000; salePrice <= 260_000; salePrice += 37) {
      const { dealerShare } = computeShares("CONSIGNMENT", {
        salePrice,
        purchasePrice: 200_000,
        commissionRateBps: 2750,
      });
      expect(dealerShare).toBeGreaterThanOrEqual(previous);
      previous = dealerShare;
    }
  });
});

describe("vente perso", () => {
  it("la boutique ne touche rien, quels que soient le prix d'achat et le taux", () => {
    expect(
      computeShares("PERSONAL", {
        salePrice: 520_000,
        purchasePrice: 450_000,
        commissionRateBps: 2500,
      }),
    ).toEqual({ dealerShare: 520_000, shopShare: 0 });
    expect(
      computeShares("PERSONAL", { salePrice: 0, purchasePrice: 450_000, commissionRateBps: 0 }),
    ).toEqual({ dealerShare: 0, shopShare: 0 });
  });
});

describe("vente directe de la boutique", () => {
  it("pas de commission : tout revient à la boutique", () => {
    expect(
      computeShares("DIRECT", {
        salePrice: 250_000,
        purchasePrice: 200_000,
        commissionRateBps: 2500,
      }),
    ).toEqual({ dealerShare: 0, shopShare: 250_000 });
  });
});

describe("stratégie remplaçable", () => {
  it("accepte une autre règle de rémunération", () => {
    const fixedFee = () => 10_000;
    expect(
      computeShares(
        "CONSIGNMENT",
        { salePrice: 250_000, purchasePrice: 200_000, commissionRateBps: 0 },
        fixedFee,
      ),
    ).toEqual({ dealerShare: 10_000, shopShare: 240_000 });
  });

  it("refuse une stratégie qui donne plus que le prix, moins que zéro ou des décimales", () => {
    const input = { salePrice: 100, purchasePrice: 0, commissionRateBps: 0 };
    for (const broken of [() => 101, () => -1, () => 12.5, () => Number.NaN]) {
      expect(() => computeShares("CONSIGNMENT", input, broken)).toThrow(RangeError);
    }
  });

  it("la stratégie par défaut est la commission sur la marge", () => {
    expect(
      marginCommission({ salePrice: 300_000, purchasePrice: 200_000, commissionRateBps: 2500 }),
    ).toBe(25_000);
  });
});

describe("entrées invalides", () => {
  it.each([
    { salePrice: -1, purchasePrice: 0, commissionRateBps: 0 },
    { salePrice: 100.5, purchasePrice: 0, commissionRateBps: 0 },
    { salePrice: 100, purchasePrice: -5, commissionRateBps: 0 },
    { salePrice: 100, purchasePrice: 0, commissionRateBps: -1 },
    { salePrice: 100, purchasePrice: 0, commissionRateBps: 10_001 },
    { salePrice: 100, purchasePrice: 0, commissionRateBps: 25.5 },
    { salePrice: Number.MAX_SAFE_INTEGER + 2, purchasePrice: 0, commissionRateBps: 0 },
  ])("refuse %o", (input) => {
    expect(() => computeShares("CONSIGNMENT", input)).toThrow(RangeError);
    expect(() => computeShares("PERSONAL", input)).toThrow(RangeError);
  });
});

describe("needsApproval", () => {
  it("exige la validation du patron seulement sous le prix plancher", () => {
    expect(needsApproval(229_999, 230_000)).toBe(true);
    expect(needsApproval(230_000, 230_000)).toBe(false);
    expect(needsApproval(250_000, 230_000)).toBe(false);
    expect(needsApproval(0, 0)).toBe(false);
  });
});
