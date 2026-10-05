import { describe, expect, it } from "vitest";
import { parseIdentifier } from "./identifier";

describe("parseIdentifier", () => {
  it("reconnaît un e-mail et le met en minuscules", () => {
    expect(parseIdentifier("  Awa@Exemple.COM ", "229")).toEqual({
      kind: "email",
      email: "awa@exemple.com",
    });
  });

  it("refuse un e-mail mal formé", () => {
    expect(parseIdentifier("awa@exemple", "229")).toBeNull();
    expect(parseIdentifier("a wa@exemple.com", "229")).toBeNull();
  });

  it("ajoute l'indicatif par défaut à un numéro local", () => {
    expect(parseIdentifier("97 00 00 00", "229")).toEqual({
      kind: "phone",
      phone: "+22997000000",
    });
  });

  it("conserve le zéro initial d'un numéro local", () => {
    expect(parseIdentifier("07 08 09 10 11", "225")).toEqual({
      kind: "phone",
      phone: "+2250708091011",
    });
  });

  it("accepte un numéro international en + ou en 00", () => {
    expect(parseIdentifier("+221 77-123-45-67", "229")).toEqual({
      kind: "phone",
      phone: "+221771234567",
    });
    expect(parseIdentifier("00221771234567", "229")).toEqual({
      kind: "phone",
      phone: "+221771234567",
    });
  });

  it("refuse les numéros trop courts, trop longs ou non numériques", () => {
    expect(parseIdentifier("123", "229")).toBeNull();
    expect(parseIdentifier("+1234567890123456", "229")).toBeNull();
    expect(parseIdentifier("97 00 abc", "229")).toBeNull();
    expect(parseIdentifier("", "229")).toBeNull();
  });
});
