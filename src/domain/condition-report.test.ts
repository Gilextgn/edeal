import { describe, expect, it } from "vitest";
import {
  fitWithin,
  missingRequiredAngles,
  parseBatteryHealth,
  photoStorageKey,
} from "./condition-report";

describe("missingRequiredAngles", () => {
  it("ne signale rien quand les quatre photos obligatoires sont là", () => {
    expect(missingRequiredAngles(["ABOUT", "FRONT", "DEFECT", "BACK", "SCREEN_ON"])).toEqual([]);
  });

  it("liste les photos obligatoires manquantes", () => {
    expect(missingRequiredAngles(["FRONT", "DEFECT", "SIDES"])).toEqual([
      "BACK",
      "SCREEN_ON",
      "ABOUT",
    ]);
    expect(missingRequiredAngles([])).toHaveLength(4);
  });

  it("une photo facultative ne remplace pas une photo obligatoire", () => {
    expect(missingRequiredAngles(["FRONT", "BACK", "SCREEN_ON", "DEFECT"])).toEqual(["ABOUT"]);
  });
});

describe("photoStorageKey", () => {
  it("range la photo sous l'appareil puis le constat", () => {
    expect(photoStorageKey("d1", "r1", "p1")).toBe("d1/r1/p1");
  });
});

describe("parseBatteryHealth", () => {
  it("lit un pourcentage entre 0 et 100", () => {
    expect(parseBatteryHealth("87")).toBe(87);
    expect(parseBatteryHealth(" 100 % ")).toBe(100);
    expect(parseBatteryHealth("0")).toBe(0);
  });

  it("accepte une valeur vide : santé inconnue", () => {
    expect(parseBatteryHealth("")).toBeNull();
    expect(parseBatteryHealth("  ")).toBeNull();
  });

  it("refuse le reste", () => {
    for (const raw of ["101", "-5", "87,5", "abc", "1000"]) {
      expect(parseBatteryHealth(raw), raw).toBeUndefined();
    }
  });
});

describe("fitWithin", () => {
  it("réduit le plus grand côté à la limite en gardant les proportions", () => {
    expect(fitWithin(4032, 3024, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3024, 4032, 1280)).toEqual({ width: 960, height: 1280 });
    expect(fitWithin(2000, 2000, 1280)).toEqual({ width: 1280, height: 1280 });
  });

  it("n'agrandit jamais une petite image", () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1280, 720, 1280)).toEqual({ width: 1280, height: 720 });
  });

  it("garde au moins un pixel pour une image très allongée", () => {
    expect(fitWithin(10000, 2, 1280)).toEqual({ width: 1280, height: 1 });
  });
});
