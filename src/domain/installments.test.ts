import { describe, expect, it } from "vitest";
import { buildSchedule, isOverdue, outstanding } from "./installments";

const base = { total: 250_000, deposit: 100_000, count: 3, today: "2026-10-05", intervalDays: 30 };

describe("buildSchedule", () => {
  it("place l'acompte aujourd'hui, payé, puis répartit le reste", () => {
    expect(buildSchedule(base)).toEqual([
      { amount: 100_000, dueOn: "2026-10-05", paid: true },
      { amount: 50_000, dueOn: "2026-11-04", paid: false },
      { amount: 50_000, dueOn: "2026-12-04", paid: false },
      { amount: 50_000, dueOn: "2027-01-03", paid: false },
    ]);
  });

  it("sans acompte, toutes les échéances sont à venir", () => {
    expect(buildSchedule({ ...base, deposit: 0, count: 2, intervalDays: 7 })).toEqual([
      { amount: 125_000, dueOn: "2026-10-12", paid: false },
      { amount: 125_000, dueOn: "2026-10-19", paid: false },
    ]);
  });

  it("met le reste de la division sur la dernière échéance", () => {
    expect(buildSchedule({ ...base, total: 100_000, deposit: 0, count: 3 })!.map((i) => i.amount))
      .toEqual([33_333, 33_333, 33_334]);
    expect(buildSchedule({ ...base, total: 250_001, deposit: 50_000, count: 4 })!.map((i) => i.amount))
      .toEqual([50_000, 50_000, 50_000, 50_000, 50_001]);
  });

  it("la somme vaut toujours exactement le prix de vente", () => {
    for (const total of [1_000, 99_999, 250_000, 250_007, 1_000_001]) {
      for (const deposit of [0, 1, 333, 900]) {
        for (const count of [1, 2, 3, 6, 7, 11]) {
          const schedule = buildSchedule({ ...base, total, deposit, count });
          expect(schedule, `${total}/${deposit}/${count}`).not.toBeNull();
          expect(schedule!.reduce((sum, i) => sum + i.amount, 0)).toBe(total);
          expect(schedule!.every((i) => i.amount > 0)).toBe(true);
        }
      }
    }
  });

  it("passe correctement les fins de mois et d'année", () => {
    const schedule = buildSchedule({ ...base, deposit: 0, count: 2, today: "2026-12-20" })!;
    expect(schedule.map((i) => i.dueOn)).toEqual(["2027-01-19", "2027-02-18"]);
    const leap = buildSchedule({ ...base, deposit: 0, count: 1, today: "2028-02-28", intervalDays: 1 })!;
    expect(leap[0].dueOn).toBe("2028-02-29");
  });

  it("refuse les données incohérentes", () => {
    const invalid = [
      { total: 0 },
      { deposit: -1 },
      { deposit: 250_000 },
      { deposit: 300_000 },
      { count: 0 },
      { count: 12 },
      { deposit: 0, count: 13 },
      { intervalDays: 0 },
      { total: 100.5 },
      { total: 5, deposit: 3, count: 3 },
    ];
    for (const override of invalid) {
      expect(buildSchedule({ ...base, ...override }), JSON.stringify(override)).toBeNull();
    }
  });

  it("accepte douze échéances au plus, acompte compris", () => {
    expect(buildSchedule({ ...base, deposit: 0, count: 12 })).toHaveLength(12);
    expect(buildSchedule({ ...base, count: 11 })).toHaveLength(12);
  });
});

describe("isOverdue", () => {
  it("en retard si non payée et date passée", () => {
    expect(isOverdue("2026-10-04", null, "2026-10-05")).toBe(true);
  });

  it("pas en retard le jour même, ni si elle est payée", () => {
    expect(isOverdue("2026-10-05", null, "2026-10-05")).toBe(false);
    expect(isOverdue("2026-10-06", null, "2026-10-05")).toBe(false);
    expect(isOverdue("2026-09-01", "2026-09-10", "2026-10-05")).toBe(false);
  });
});

describe("outstanding", () => {
  it("additionne les échéances non payées", () => {
    expect(
      outstanding([
        { amount: 100_000, paid_on: "2026-10-05" },
        { amount: 50_000, paid_on: null },
        { amount: 50_000, paid_on: null },
      ]),
    ).toBe(100_000);
    expect(outstanding([])).toBe(0);
  });
});
