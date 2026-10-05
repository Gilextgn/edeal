import { describe, expect, it } from "vitest";
import { allocateSettlement, dealerBalance, type SaleDue } from "./settlement";

const dues: SaleDue[] = [
  { saleId: "b", due: 237_500, soldAt: "2026-10-02T10:00:00Z" },
  { saleId: "a", due: 215_000, soldAt: "2026-10-01T10:00:00Z" },
  { saleId: "c", due: 100_000, soldAt: "2026-10-03T10:00:00Z" },
];

describe("dealerBalance", () => {
  it("somme des parts boutique moins somme des règlements", () => {
    expect(dealerBalance([237_500, 215_000], [])).toBe(452_500);
    expect(dealerBalance([237_500, 215_000], [200_000, 52_500])).toBe(200_000);
    expect(dealerBalance([237_500, 215_000], [452_500])).toBe(0);
  });

  it("vaut zéro sans vente", () => {
    expect(dealerBalance([], [])).toBe(0);
  });
});

describe("allocateSettlement", () => {
  it("solde d'abord les ventes les plus anciennes", () => {
    expect(allocateSettlement(300_000, dues)).toEqual([
      { saleId: "a", amount: 215_000 },
      { saleId: "b", amount: 85_000 },
    ]);
  });

  it("un règlement peut couvrir exactement une vente", () => {
    expect(allocateSettlement(215_000, dues)).toEqual([{ saleId: "a", amount: 215_000 }]);
  });

  it("un règlement peut couvrir toutes les ventes d'un coup", () => {
    expect(allocateSettlement(552_500, dues)).toEqual([
      { saleId: "a", amount: 215_000 },
      { saleId: "b", amount: 237_500 },
      { saleId: "c", amount: 100_000 },
    ]);
  });

  it("commence par les ventes désignées, puis reprend l'ordre d'ancienneté", () => {
    expect(allocateSettlement(150_000, dues, ["c"])).toEqual([
      { saleId: "c", amount: 100_000 },
      { saleId: "a", amount: 50_000 },
    ]);
    expect(allocateSettlement(400_000, dues, ["c", "b"])).toEqual([
      { saleId: "b", amount: 237_500 },
      { saleId: "c", amount: 100_000 },
      { saleId: "a", amount: 62_500 },
    ]);
  });

  it("un règlement partiel laisse le reste dû sur la vente", () => {
    expect(allocateSettlement(1, dues)).toEqual([{ saleId: "a", amount: 1 }]);
  });

  it("ignore les ventes déjà soldées", () => {
    const withSettled = [{ saleId: "z", due: 0, soldAt: "2026-09-01T00:00:00Z" }, ...dues];
    expect(allocateSettlement(215_000, withSettled, ["z"])).toEqual([
      { saleId: "a", amount: 215_000 },
    ]);
  });

  it("répartit toujours exactement le montant du règlement", () => {
    for (const amount of [1, 99_999, 215_000, 215_001, 452_499, 552_500]) {
      const allocations = allocateSettlement(amount, dues)!;
      expect(allocations.reduce((sum, a) => sum + a.amount, 0)).toBe(amount);
      for (const allocation of allocations) {
        const due = dues.find((d) => d.saleId === allocation.saleId)!.due;
        expect(allocation.amount).toBeGreaterThan(0);
        expect(allocation.amount).toBeLessThanOrEqual(due);
      }
    }
  });

  it("refuse un montant supérieur à ce qui est dû", () => {
    expect(allocateSettlement(552_501, dues)).toBeNull();
    expect(allocateSettlement(1, [])).toBeNull();
  });

  it("refuse un montant nul, négatif ou non entier", () => {
    expect(allocateSettlement(0, dues)).toBeNull();
    expect(allocateSettlement(-5, dues)).toBeNull();
    expect(allocateSettlement(10.5, dues)).toBeNull();
  });

  it("à date égale, l'ordre reste stable", () => {
    const sameDay: SaleDue[] = [
      { saleId: "y", due: 10, soldAt: "2026-10-01T10:00:00Z" },
      { saleId: "x", due: 10, soldAt: "2026-10-01T10:00:00Z" },
    ];
    expect(allocateSettlement(15, sameDay)).toEqual([
      { saleId: "x", amount: 10 },
      { saleId: "y", amount: 5 },
    ]);
  });
});
