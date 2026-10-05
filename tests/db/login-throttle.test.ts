import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { anonClient, randomEmail, signUpUser } from "./helpers";

const secret = process.env.SUPABASE_SECRET_KEY;
if (!secret) throw new Error("SUPABASE_SECRET_KEY absente de .env.local.");

// Le serveur de l'application : seul à pouvoir appeler ces fonctions.
const server = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, {
  auth: { persistSession: false },
});

const lockSeconds = async (hash: string) =>
  (await server.rpc("login_lock_seconds", { p_identifier_hash: hash })).data as number;
const record = (hash: string, succeeded: boolean) =>
  server.rpc("record_login_attempt", { p_identifier_hash: hash, p_succeeded: succeeded });

describe("frein contre les essais de mots de passe", () => {
  it("laisse passer tant qu'il y a moins de cinq échecs", async () => {
    const hash = randomUUID();
    expect(await lockSeconds(hash)).toBe(0);
    for (let i = 0; i < 4; i++) await record(hash, false);
    expect(await lockSeconds(hash)).toBe(0);
  });

  it("bloque environ quinze minutes après cinq échecs", async () => {
    const hash = randomUUID();
    for (let i = 0; i < 5; i++) await record(hash, false);

    const wait = await lockSeconds(hash);
    expect(wait).toBeGreaterThan(14 * 60);
    expect(wait).toBeLessThanOrEqual(15 * 60);
  });

  it("une connexion réussie remet le compteur à zéro", async () => {
    const hash = randomUUID();
    for (let i = 0; i < 4; i++) await record(hash, false);
    await record(hash, true);
    for (let i = 0; i < 4; i++) await record(hash, false);
    expect(await lockSeconds(hash)).toBe(0);
  });

  it("le blocage d'un compte ne touche pas les autres", async () => {
    const locked = randomUUID();
    const other = randomUUID();
    for (let i = 0; i < 6; i++) await record(locked, false);
    expect(await lockSeconds(locked)).toBeGreaterThan(0);
    expect(await lockSeconds(other)).toBe(0);
  });

  it("ni un visiteur ni un utilisateur connecté ne peuvent appeler ces fonctions", async () => {
    const user = await signUpUser("Awa", { email: randomEmail() });
    const hash = randomUUID();

    for (const client of [anonClient(), user.client]) {
      const read = await client.rpc("login_lock_seconds", { p_identifier_hash: hash });
      expect(read.error).not.toBeNull();
      const write = await client.rpc("record_login_attempt", {
        p_identifier_hash: hash,
        p_succeeded: false,
      });
      expect(write.error).not.toBeNull();
    }
    // Leurs appels n'ont rien enregistré.
    for (let i = 0; i < 4; i++) await record(hash, false);
    expect(await lockSeconds(hash)).toBe(0);
  });
});

describe("règles de mot de passe côté service d'authentification", () => {
  it("refuse un mot de passe sans chiffre ou trop court, même en contournant l'écran", async () => {
    for (const password of ["seulementdeslettres", "abc12"]) {
      const { data, error } = await anonClient().auth.signUp({
        email: randomEmail(),
        password,
        options: { data: { name: "Test" } },
      });
      expect(error, password).not.toBeNull();
      expect(data.user).toBeNull();
    }
  });
});
