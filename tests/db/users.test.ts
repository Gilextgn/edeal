import { describe, expect, it } from "vitest";
import {
  anonClient,
  randomEmail,
  randomPhone,
  signUpUser,
  TEST_PASSWORD,
} from "./helpers";

describe("inscription et connexion", () => {
  it("crée le profil à l'inscription par téléphone, sans SMS", async () => {
    const phone = randomPhone();
    const { client, id } = await signUpUser("Awa", { phone });

    const { data } = await client.from("users").select("id, name, phone, email");
    expect(data).toEqual([
      { id, name: "Awa", phone: phone.slice(1), email: null },
    ]);
  });

  it("crée le profil à l'inscription par e-mail", async () => {
    const email = randomEmail();
    const { client, id } = await signUpUser("Koffi", { email });

    const { data } = await client.from("users").select("id, name, phone, email");
    expect(data).toEqual([{ id, name: "Koffi", phone: null, email }]);
  });

  it("connecte par téléphone et mot de passe", async () => {
    const phone = randomPhone();
    await signUpUser("Awa", { phone });

    const { data, error } = await anonClient().auth.signInWithPassword({
      phone,
      password: TEST_PASSWORD,
    });
    expect(error).toBeNull();
    expect(data.session).not.toBeNull();
  });

  it("refuse un mauvais mot de passe", async () => {
    const email = randomEmail();
    await signUpUser("Koffi", { email });

    const { error } = await anonClient().auth.signInWithPassword({
      email,
      password: "mauvais-mot-de-passe-1",
    });
    expect(error?.code).toBe("invalid_credentials");
  });

  it("sans nom fourni, prend le début de l'adresse e-mail", async () => {
    const email = randomEmail();
    const client = anonClient();
    const { error } = await client.auth.signUp({ email, password: TEST_PASSWORD });
    expect(error).toBeNull();

    const { data } = await client.from("users").select("name").single();
    expect(data?.name).toBe(email.split("@")[0]);
  });

  it("prend le nom fourni par Google (« full_name »)", async () => {
    const client = anonClient();
    await client.auth.signUp({
      email: randomEmail(),
      password: TEST_PASSWORD,
      options: { data: { full_name: "  Awa Dossou  " } },
    });

    const { data } = await client.from("users").select("name").single();
    expect(data?.name).toBe("Awa Dossou");
  });

  it("refuse un second compte avec le même identifiant", async () => {
    const email = randomEmail();
    await signUpUser("Koffi", { email });

    const { error } = await anonClient().auth.signUp({
      email,
      password: TEST_PASSWORD,
      options: { data: { name: "Autre" } },
    });
    expect(error?.code).toBe("user_already_exists");
  });
});

describe("étanchéité de la table users", () => {
  it("un visiteur non connecté ne lit aucun profil", async () => {
    await signUpUser("Awa", { phone: randomPhone() });

    const { data, error } = await anonClient().from("users").select("id");
    expect(data ?? []).toEqual([]);
    expect(error).not.toBeNull();
  });

  it("un utilisateur ne lit que son propre profil", async () => {
    const awa = await signUpUser("Awa", { phone: randomPhone() });
    const koffi = await signUpUser("Koffi", { email: randomEmail() });

    const { data } = await awa.client.from("users").select("id");
    expect(data).toEqual([{ id: awa.id }]);

    const { data: other } = await awa.client
      .from("users")
      .select("id")
      .eq("id", koffi.id);
    expect(other).toEqual([]);
  });

  it("un utilisateur ne modifie pas le profil d'un autre", async () => {
    const awa = await signUpUser("Awa", { phone: randomPhone() });
    const koffi = await signUpUser("Koffi", { email: randomEmail() });

    await awa.client.from("users").update({ name: "Piraté" }).eq("id", koffi.id);

    const { data } = await koffi.client.from("users").select("name");
    expect(data).toEqual([{ name: "Koffi" }]);
  });

  it("un utilisateur modifie son nom mais pas son téléphone ni son e-mail", async () => {
    const awa = await signUpUser("Awa", { phone: randomPhone() });

    const renamed = await awa.client
      .from("users")
      .update({ name: "Awa D." })
      .eq("id", awa.id);
    expect(renamed.error).toBeNull();

    const forged = await awa.client
      .from("users")
      .update({ email: "autre@exemple.test" })
      .eq("id", awa.id);
    expect(forged.error).not.toBeNull();

    const { data } = await awa.client.from("users").select("name, email");
    expect(data).toEqual([{ name: "Awa D.", email: null }]);
  });

  it("personne ne crée ni ne supprime un profil directement", async () => {
    const awa = await signUpUser("Awa", { phone: randomPhone() });

    const inserted = await awa.client
      .from("users")
      .insert({ id: crypto.randomUUID(), name: "Faux", email: randomEmail() });
    expect(inserted.error).not.toBeNull();

    const deleted = await awa.client.from("users").delete().eq("id", awa.id);
    expect(deleted.error).not.toBeNull();

    const { data } = await awa.client.from("users").select("id");
    expect(data).toEqual([{ id: awa.id }]);
  });
});
