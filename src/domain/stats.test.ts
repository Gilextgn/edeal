import { describe, expect, it } from "vitest";
import { dailyTotals, monthBounds, relativeChange } from "./stats";

const now = new Date("2026-10-05T14:30:00Z");

describe("monthBounds", () => {
  it("donne le début du mois courant et du mois précédent", () => {
    expect(monthBounds(now)).toEqual({
      thisMonth: "2026-10-01T00:00:00.000Z",
      lastMonth: "2026-09-01T00:00:00.000Z",
    });
  });

  it("passe correctement le changement d'année", () => {
    expect(monthBounds(new Date("2027-01-15T00:00:00Z")).lastMonth).toBe(
      "2026-12-01T00:00:00.000Z",
    );
  });
});

describe("dailyTotals", () => {
  const sales = [
    { created_at: "2026-10-05T09:00:00Z", sale_price: 250_000 },
    { created_at: "2026-10-05T16:00:00Z", sale_price: 300_000 },
    { created_at: "2026-10-03T12:00:00Z", sale_price: 100_000 },
    { created_at: "2026-09-01T12:00:00Z", sale_price: 999_999 },
  ];

  it("additionne les ventes de chaque jour, du plus ancien au plus récent", () => {
    expect(dailyTotals(sales, 3, now)).toEqual([
      { day: "2026-10-03", total: 100_000, count: 1 },
      { day: "2026-10-04", total: 0, count: 0 },
      { day: "2026-10-05", total: 550_000, count: 2 },
    ]);
  });

  it("ignore les ventes hors de la période", () => {
    const series = dailyTotals(sales, 14, now);
    expect(series).toHaveLength(14);
    expect(series[0].day).toBe("2026-09-22");
    expect(series.reduce((sum, d) => sum + d.total, 0)).toBe(650_000);
  });

  it("renvoie des jours à zéro sans vente", () => {
    expect(dailyTotals([], 2, now)).toEqual([
      { day: "2026-10-04", total: 0, count: 0 },
      { day: "2026-10-05", total: 0, count: 0 },
    ]);
  });
});

describe("relativeChange", () => {
  it("calcule l'évolution par rapport à la période précédente", () => {
    expect(relativeChange(125, 100)).toBe(0.25);
    expect(relativeChange(50, 100)).toBe(-0.5);
    expect(relativeChange(100, 100)).toBe(0);
  });

  it("vaut null quand il n'y a rien à comparer", () => {
    expect(relativeChange(100, 0)).toBeNull();
    expect(relativeChange(0, 0)).toBeNull();
  });
});
