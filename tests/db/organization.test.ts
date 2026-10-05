import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { randomEmail, randomPhone, signUpUser } from "./helpers";

async function createShop(client: SupabaseClient, name: string) {
  const { data, error } = await client.rpc("create_shop", { p_name: name });
  if (error) throw new Error(`create_shop : ${error.message}`);
  return data as string;
}

// Un patron avec sa boutique, un dealer et un caissier déjà inscrits et ajoutés.
async function shopWithTeam() {
  const dealerPhone = randomPhone();
  const cashierEmail = randomEmail();
  const patron = await signUpUser("Patron", { email: randomEmail() });
  const dealer = await signUpUser("Dealer", { phone: dealerPhone });
  const cashier = await signUpUser("Caissier", { email: cashierEmail });
  const shopId = await createShop(patron.client, "Boutique A");

  const added = await patron.client.rpc("add_member", {
    p_shop_id: shopId,
    p_role: "DEALER",
    p_commission_rate_bps: 2500,
    p_phone: dealerPhone,
  });
  expect(added.data).toBe("member");
  await patron.client.rpc("add_member", {
    p_shop_id: shopId,
    p_role: "CAISSIER",
    p_email: cashierEmail,
  });

  return { patron, dealer, cashier, shopId, dealerPhone };
}

describe("création de boutique", () => {
  it("le créateur devient patron et voit sa boutique", async () => {
    const patron = await signUpUser("Patron", { email: randomEmail() });
    const shopId = await createShop(patron.client, "  Boutique A  ");

    const { data: shops } = await patron.client
      .from("shops")
      .select("id, name, currency");
    expect(shops).toEqual([{ id: shopId, name: "Boutique A", currency: "XOF" }]);

    const { data: members } = await patron.client
      .from("memberships")
      .select("user_id, role, commission_rate_bps, active");
    expect(members).toEqual([
      { user_id: patron.id, role: "PATRON", commission_rate_bps: 0, active: true },
    ]);
  });

  it("personne ne crée de boutique ni de membre sans passer par les fonctions", async () => {
    const user = await signUpUser("Awa", { email: randomEmail() });
    const shopId = await createShop(user.client, "Boutique A");
    const other = await signUpUser("Autre", { email: randomEmail() });

    const shop = await other.client.from("shops").insert({ name: "Pirate" });
    expect(shop.error).not.toBeNull();

    const member = await other.client
      .from("memberships")
      .insert({ shop_id: shopId, user_id: other.id, role: "PATRON" });
    expect(member.error).not.toBeNull();

    const { data } = await other.client.from("shops").select("id");
    expect(data).toEqual([]);
  });
});

describe("étanchéité entre boutiques", () => {
  it("un inconnu ne voit ni la boutique, ni ses membres, ni ses invitations", async () => {
    const { patron, shopId } = await shopWithTeam();
    await patron.client.rpc("add_member", {
      p_shop_id: shopId,
      p_role: "DEALER",
      p_commission_rate_bps: 1000,
      p_phone: randomPhone(),
    });
    const stranger = await signUpUser("Inconnu", { email: randomEmail() });

    expect((await stranger.client.from("shops").select("id")).data).toEqual([]);
    expect(
      (await stranger.client.from("memberships").select("id")).data,
    ).toEqual([]);
    expect(
      (await stranger.client.from("invitations").select("id")).data,
    ).toEqual([]);
    expect((await stranger.client.from("users").select("id")).data).toEqual([
      { id: stranger.id },
    ]);
  });

  it("le patron d'une boutique ne voit pas les membres d'une autre", async () => {
    const a = await shopWithTeam();
    const b = await shopWithTeam();

    const { data: shops } = await a.patron.client.from("shops").select("id");
    expect(shops).toEqual([{ id: a.shopId }]);

    const { data: members } = await a.patron.client
      .from("memberships")
      .select("shop_id");
    expect(members).toHaveLength(3);
    expect(members!.every((m) => m.shop_id === a.shopId)).toBe(true);

    const { data: profiles } = await a.patron.client
      .from("users")
      .select("id")
      .in("id", [b.patron.id, b.dealer.id, b.cashier.id]);
    expect(profiles).toEqual([]);
  });

  it("un dealer membre de deux boutiques voit les deux, avec son taux dans chacune", async () => {
    const a = await shopWithTeam();
    const otherPatron = await signUpUser("Patron B", { email: randomEmail() });
    const shopB = await createShop(otherPatron.client, "Boutique B");
    await otherPatron.client.rpc("add_member", {
      p_shop_id: shopB,
      p_role: "DEALER",
      p_commission_rate_bps: 4000,
      p_phone: a.dealerPhone,
    });

    const { data } = await a.dealer.client
      .from("memberships")
      .select("shop_id, commission_rate_bps")
      .order("commission_rate_bps");
    expect(data).toEqual([
      { shop_id: a.shopId, commission_rate_bps: 2500 },
      { shop_id: shopB, commission_rate_bps: 4000 },
    ]);
    expect((await a.dealer.client.from("shops").select("id")).data).toHaveLength(2);
  });
});

describe("visibilité selon le rôle", () => {
  it("le patron voit tous les membres et leur profil", async () => {
    const { patron, dealer, cashier } = await shopWithTeam();

    const { data: members } = await patron.client
      .from("memberships")
      .select("role");
    expect(members!.map((m) => m.role).sort()).toEqual([
      "CAISSIER",
      "DEALER",
      "PATRON",
    ]);

    const { data: profiles } = await patron.client
      .from("users")
      .select("name")
      .in("id", [dealer.id, cashier.id])
      .order("name");
    expect(profiles).toEqual([{ name: "Caissier" }, { name: "Dealer" }]);
  });

  it("le dealer et le caissier ne voient que leur propre ligne de membre", async () => {
    const { dealer, cashier, shopId } = await shopWithTeam();

    for (const member of [dealer, cashier]) {
      const { data: shops } = await member.client.from("shops").select("id");
      expect(shops).toEqual([{ id: shopId }]);

      const { data: members } = await member.client
        .from("memberships")
        .select("user_id");
      expect(members).toEqual([{ user_id: member.id }]);

      const { data: profiles } = await member.client.from("users").select("id");
      expect(profiles).toEqual([{ id: member.id }]);

      const { data: invitations } = await member.client
        .from("invitations")
        .select("id");
      expect(invitations).toEqual([]);
    }
  });

  it("un membre désactivé perd l'accès à la boutique", async () => {
    const { patron, dealer } = await shopWithTeam();
    const { data: row } = await patron.client
      .from("memberships")
      .select("id")
      .eq("user_id", dealer.id)
      .single();

    const { error } = await patron.client.rpc("update_member", {
      p_membership_id: row!.id,
      p_role: "DEALER",
      p_commission_rate_bps: 2500,
      p_active: false,
    });
    expect(error).toBeNull();

    expect((await dealer.client.from("shops").select("id")).data).toEqual([]);
    expect((await dealer.client.from("memberships").select("id")).data).toEqual(
      [],
    );
  });
});

describe("gestion des membres", () => {
  it("seul le patron ajoute, modifie ou renomme", async () => {
    const { patron, dealer, cashier, shopId } = await shopWithTeam();
    const { data: dealerRow } = await patron.client
      .from("memberships")
      .select("id")
      .eq("user_id", dealer.id)
      .single();

    for (const member of [dealer, cashier]) {
      const added = await member.client.rpc("add_member", {
        p_shop_id: shopId,
        p_role: "DEALER",
        p_commission_rate_bps: 9000,
        p_phone: randomPhone(),
      });
      expect(added.error?.message).toBe("not_patron");

      const updated = await member.client.rpc("update_member", {
        p_membership_id: dealerRow!.id,
        p_role: "DEALER",
        p_commission_rate_bps: 9000,
        p_active: true,
      });
      expect(updated.error?.message).toBe("not_patron");

      await member.client.from("shops").update({ name: "Piraté" }).eq("id", shopId);
    }

    const { data: shop } = await patron.client
      .from("shops")
      .select("name")
      .single();
    expect(shop).toEqual({ name: "Boutique A" });

    const { data: rate } = await patron.client
      .from("memberships")
      .select("commission_rate_bps")
      .eq("id", dealerRow!.id)
      .single();
    expect(rate).toEqual({ commission_rate_bps: 2500 });
  });

  it("le patron d'une autre boutique ne modifie pas un membre", async () => {
    const a = await shopWithTeam();
    const b = await shopWithTeam();
    const { data: row } = await a.patron.client
      .from("memberships")
      .select("id")
      .eq("user_id", a.dealer.id)
      .single();

    const { error } = await b.patron.client.rpc("update_member", {
      p_membership_id: row!.id,
      p_role: "DEALER",
      p_commission_rate_bps: 0,
      p_active: false,
    });
    expect(error?.message).toBe("not_patron");
  });

  it("le patron renomme sa boutique et change un taux", async () => {
    const { patron, dealer, shopId } = await shopWithTeam();
    const { data: row } = await patron.client
      .from("memberships")
      .select("id")
      .eq("user_id", dealer.id)
      .single();

    await patron.client.from("shops").update({ name: "iStore Cotonou" }).eq("id", shopId);
    await patron.client.rpc("update_member", {
      p_membership_id: row!.id,
      p_role: "DEALER",
      p_commission_rate_bps: 3050,
      p_active: true,
    });

    const { data: shop } = await dealer.client.from("shops").select("name").single();
    expect(shop).toEqual({ name: "iStore Cotonou" });
    const { data: mine } = await dealer.client
      .from("memberships")
      .select("commission_rate_bps")
      .single();
    expect(mine).toEqual({ commission_rate_bps: 3050 });
  });

  it("le rôle de patron ne se donne pas et ne se retire pas", async () => {
    const { patron, dealer, shopId } = await shopWithTeam();
    const { data: rows } = await patron.client
      .from("memberships")
      .select("id, user_id");
    const idOf = (userId: string) => rows!.find((r) => r.user_id === userId)!.id;

    const promote = await patron.client.rpc("update_member", {
      p_membership_id: idOf(dealer.id),
      p_role: "PATRON",
      p_commission_rate_bps: 0,
      p_active: true,
    });
    expect(promote.error?.message).toBe("invalid_role");

    const demote = await patron.client.rpc("update_member", {
      p_membership_id: idOf(patron.id),
      p_role: "CAISSIER",
      p_commission_rate_bps: 0,
      p_active: false,
    });
    expect(demote.error?.message).toBe("invalid_role");

    const add = await patron.client.rpc("add_member", {
      p_shop_id: shopId,
      p_role: "PATRON",
      p_email: randomEmail(),
    });
    expect(add.error?.message).toBe("invalid_role");
  });

  it("refuse un doublon, un taux hors limites et un identifiant invalide", async () => {
    const { patron, shopId, dealerPhone } = await shopWithTeam();
    const add = (args: Record<string, unknown>) =>
      patron.client.rpc("add_member", { p_shop_id: shopId, p_role: "DEALER", ...args });

    expect(
      (await add({ p_commission_rate_bps: 1000, p_phone: dealerPhone })).error
        ?.message,
    ).toBe("already_member");
    expect(
      (await add({ p_commission_rate_bps: 10001, p_phone: randomPhone() })).error
        ?.message,
    ).toBe("invalid_rate");
    expect(
      (await add({ p_commission_rate_bps: -1, p_phone: randomPhone() })).error
        ?.message,
    ).toBe("invalid_rate");
    expect(
      (await add({ p_commission_rate_bps: 1000, p_phone: "12" })).error?.message,
    ).toBe("invalid_identifier");
    expect((await add({ p_commission_rate_bps: 1000 })).error?.message).toBe(
      "invalid_identifier",
    );
  });

  it("un caissier n'a jamais de taux de commission", async () => {
    const { patron, cashier } = await shopWithTeam();
    const { data: row } = await patron.client
      .from("memberships")
      .select("id")
      .eq("user_id", cashier.id)
      .single();

    await patron.client.rpc("update_member", {
      p_membership_id: row!.id,
      p_role: "CAISSIER",
      p_commission_rate_bps: 5000,
      p_active: true,
    });

    const { data } = await cashier.client
      .from("memberships")
      .select("commission_rate_bps")
      .single();
    expect(data).toEqual({ commission_rate_bps: 0 });
  });
});

describe("invitations", () => {
  it("un numéro sans compte est invité, puis devient membre à l'inscription", async () => {
    const patron = await signUpUser("Patron", { email: randomEmail() });
    const shopId = await createShop(patron.client, "Boutique A");
    const phone = randomPhone();

    const invited = await patron.client.rpc("add_member", {
      p_shop_id: shopId,
      p_role: "DEALER",
      p_commission_rate_bps: 2000,
      p_phone: phone,
    });
    expect(invited.data).toBe("invitation");

    const again = await patron.client.rpc("add_member", {
      p_shop_id: shopId,
      p_role: "DEALER",
      p_commission_rate_bps: 2000,
      p_phone: phone,
    });
    expect(again.error?.message).toBe("already_invited");

    const dealer = await signUpUser("Nouveau dealer", { phone });

    const { data: mine } = await dealer.client
      .from("memberships")
      .select("shop_id, role, commission_rate_bps");
    expect(mine).toEqual([
      { shop_id: shopId, role: "DEALER", commission_rate_bps: 2000 },
    ]);
    expect(
      (await patron.client.from("invitations").select("id")).data,
    ).toEqual([]);
  });

  it("le patron annule une invitation ; un autre membre ne le peut pas", async () => {
    const { patron, dealer, shopId } = await shopWithTeam();
    const email = randomEmail();
    await patron.client.rpc("add_member", {
      p_shop_id: shopId,
      p_role: "CAISSIER",
      p_email: email,
    });
    const { data: invitation } = await patron.client
      .from("invitations")
      .select("id")
      .single();

    await dealer.client.from("invitations").delete().eq("id", invitation!.id);
    expect(
      (await patron.client.from("invitations").select("id")).data,
    ).toHaveLength(1);

    await patron.client.from("invitations").delete().eq("id", invitation!.id);
    expect(
      (await patron.client.from("invitations").select("id")).data,
    ).toEqual([]);

    const late = await signUpUser("Trop tard", { email });
    expect((await late.client.from("memberships").select("id")).data).toEqual([]);
  });
});
