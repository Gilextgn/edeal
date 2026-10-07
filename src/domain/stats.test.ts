import { describe, expect, it } from "vitest";
import {
  dailyTotals,
  monthlyTotals,
  parsePeriod,
  periodBounds,
  periodTotals,
  relativeChange,
} from "./stats";

const now = new Date("2026-10-05T14:30:00Z");

describe("parsePeriod", () => {
  it("lit la période de l'adresse, le mois par défaut", () => {
    expect(parsePeriod("week")).toBe("week");
    expect(parsePeriod(["year", "week"])).toBe("year");
    for (const raw of [undefined, "", "jour", "MONTH"]) {
      expect(parsePeriod(raw), String(raw)).toBe("month");
    }
  });
});

describe("periodBounds", () => {
  it("7 derniers jours, aujourd'hui compris, et les 7 jours d'avant", () => {
    expect(periodBounds("week", now)).toEqual({
      start: "2026-09-29T00:00:00.000Z",
      previousStart: "2026-09-22T00:00:00.000Z",
    });
  });

  it("30 derniers jours et les 30 d'avant", () => {
    expect(periodBounds("month", now)).toEqual({
      start: "2026-09-06T00:00:00.000Z",
      previousStart: "2026-08-07T00:00:00.000Z",
    });
  });

  it("12 derniers mois (mois courant compris) et les 12 d'avant", () => {
    expect(periodBounds("year", now)).toEqual({
      start: "2025-11-01T00:00:00.000Z",
      previousStart: "2024-11-01T00:00:00.000Z",
    });
  });
});

const sales = [
  { created_at: "2026-10-05T09:00:00Z", sale_price: 250_000 },
  { created_at: "2026-10-05T16:00:00Z", sale_price: 300_000 },
  { created_at: "2026-10-03T12:00:00Z", sale_price: 100_000 },
  { created_at: "2026-09-01T12:00:00Z", sale_price: 999_999 },
  { created_at: "2025-11-15T12:00:00Z", sale_price: 40_000 },
];

describe("dailyTotals", () => {
  it("additionne les ventes de chaque jour, du plus ancien au plus récent", () => {
    expect(dailyTotals(sales, 3, now)).toEqual([
      { key: "2026-10-03", total: 100_000, count: 1 },
      { key: "2026-10-04", total: 0, count: 0 },
      { key: "2026-10-05", total: 550_000, count: 2 },
    ]);
  });

  it("ignore les ventes hors de la période", () => {
    const series = dailyTotals(sales, 14, now);
    expect(series).toHaveLength(14);
    expect(series[0].key).toBe("2026-09-22");
    expect(series.reduce((sum, d) => sum + d.total, 0)).toBe(650_000);
  });

  it("renvoie des jours à zéro sans vente", () => {
    expect(dailyTotals([], 2, now)).toEqual([
      { key: "2026-10-04", total: 0, count: 0 },
      { key: "2026-10-05", total: 0, count: 0 },
    ]);
  });
});

describe("monthlyTotals", () => {
  it("additionne les ventes de chaque mois", () => {
    const series = monthlyTotals(sales, 12, now);
    expect(series).toHaveLength(12);
    expect(series[0]).toEqual({ key: "2025-11", total: 40_000, count: 1 });
    expect(series.at(-2)).toEqual({ key: "2026-09", total: 999_999, count: 1 });
    expect(series.at(-1)).toEqual({ key: "2026-10", total: 650_000, count: 3 });
  });

  it("passe correctement le changement d'année", () => {
    const series = monthlyTotals([], 3, new Date("2027-01-15T00:00:00Z"));
    expect(series.map((bucket) => bucket.key)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });
});

describe("periodTotals", () => {
  it("donne 7 jours, 30 jours ou 12 mois selon la période", () => {
    expect(periodTotals(sales, "week", now)).toHaveLength(7);
    expect(periodTotals(sales, "month", now)).toHaveLength(30);
    expect(periodTotals(sales, "year", now)).toHaveLength(12);
  });

  it("le total des barres est le total vendu sur la période", () => {
    const total = (period: "week" | "month" | "year") =>
      periodTotals(sales, period, now).reduce((sum, bucket) => sum + bucket.total, 0);
    expect(total("week")).toBe(650_000);
    expect(total("month")).toBe(650_000);
    expect(total("year")).toBe(1_689_999);
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
