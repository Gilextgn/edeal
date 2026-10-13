import { describe, expect, it } from "vitest";
import { passwordIssues } from "./password";
import { temporaryPassword } from "./temp-password";

describe("temporaryPassword", () => {
  it("donne 4 lettres, 4 chiffres, 2 lettres, sans caractères ambigus", () => {
    for (let i = 0; i < 200; i++) {
      const password = temporaryPassword();
      expect(password).toMatch(/^[a-hj-km-np-z]{4}[2-9]{4}[a-hj-km-np-z]{2}$/);
    }
  });

  it("respecte les règles de mot de passe de l'application", () => {
    for (let i = 0; i < 200; i++) {
      expect(passwordIssues(temporaryPassword(), "awa@exemple.com")).toEqual([]);
    }
  });

  it("change à chaque tirage", () => {
    const drawn = new Set(Array.from({ length: 50 }, () => temporaryPassword()));
    expect(drawn.size).toBe(50);
  });

  it("utilise la source de hasard fournie", () => {
    expect(temporaryPassword(() => 0)).toBe("aaaa2222aa");
  });
});
