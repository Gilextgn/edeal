import { describe, expect, it } from "vitest";
import { passwordIssues, passwordStrength } from "./password";

describe("passwordIssues", () => {
  it("accepte un mot de passe de 8 caractères avec lettres et chiffres", () => {
    expect(passwordIssues("cotonou2026")).toEqual([]);
    expect(passwordIssues("Été-2026!")).toEqual([]);
  });

  it("refuse un mot de passe trop court", () => {
    expect(passwordIssues("abc123")).toEqual(["too_short"]);
  });

  it("exige au moins une lettre et un chiffre", () => {
    expect(passwordIssues("12345678901")).toEqual(["needs_letter"]);
    expect(passwordIssues("motsecretlong")).toEqual(["needs_digit"]);
  });

  it("refuse les mots de passe les plus courants, quelle que soit la casse", () => {
    for (const common of ["password123", "Azerty123", "MOTDEPASSE1", "iphone123"]) {
      expect(passwordIssues(common), common).toContain("too_common");
    }
  });

  it("refuse une répétition du même caractère", () => {
    expect(passwordIssues("aaaaaaaaaa")).toContain("too_common");
  });

  it("refuse un mot de passe qui contient le numéro ou l'e-mail du compte", () => {
    expect(passwordIssues("awa97112233", "+22997112233")).toEqual(["contains_identifier"]);
    expect(passwordIssues("x97112233y", "97 11 22 33")).toEqual(["contains_identifier"]);
    expect(passwordIssues("koffi.dealer2026", "koffi.dealer@exemple.com")).toEqual([
      "contains_identifier",
    ]);
  });

  it("ne confond pas un identifiant court avec le mot de passe", () => {
    expect(passwordIssues("abricot2026", "ab@exemple.com")).toEqual([]);
  });

  it("peut signaler plusieurs problèmes à la fois", () => {
    expect(passwordIssues("")).toEqual(["too_short", "needs_letter", "needs_digit"]);
  });
});

describe("passwordStrength", () => {
  it("vaut 0 pour un champ vide et 1 pour un mot de passe refusé", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("abc")).toBe(1);
    expect(passwordStrength("password123")).toBe(1);
  });

  it("monte avec la longueur et la variété des caractères", () => {
    expect(passwordStrength("cotonou26")).toBe(2);
    expect(passwordStrength("cotonou2026ok")).toBe(3);
    expect(passwordStrength("Cotonou26!")).toBe(3);
    expect(passwordStrength("Cotonou-2026-ok")).toBe(4);
  });
});
