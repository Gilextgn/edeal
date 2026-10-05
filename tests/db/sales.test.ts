import { describe, expect, it } from "vitest";
import {
  consign,
  createDevice,
  membershipId,
  randomEmail,
  randomPhone,
  reportPayload,
  sell,
  shopWithConsignment,
  shopWithTeam,
  signUpUser,
  uploadPhotos,
  type TestUser,
} from "./helpers";

// Dans ces tests : prix d'achat 200 000, plancher 230 000, taux du dealer 25 %.

async function saleRow(user: TestUser, saleId: string) {
  const { data } = await user.client
    .from("sales")
    .select(
      "type, status, sale_price, purchase_price, commission_rate_bps, shop_share, dealer_share, seller_user_id, consignment_id",
    )
    .eq("id", saleId)
    .maybeSingle();
  return data;
}

async function deviceStatus(user: TestUser, deviceId: string) {
  const { data } = await user.client
    .from("devices")
    .select("status")
    .eq("id", deviceId)
    .single();
  return data?.status;
}

describe("vente d'un appareil confié", () => {
  it("calcule les parts : 25 % de la marge au dealer, le reste à la boutique", async () => {
    const { patron, dealer, deviceId, consignmentId } = await shopWithConsignment();

    const { data: status, error, sale } = await sell(dealer, deviceId, { sale_price: 250000 });
    expect(error).toBeNull();
    expect(status).toBe("COMPLETED");

    expect(await saleRow(patron, sale.id)).toEqual({
      type: "SHOP",
      status: "COMPLETED",
      sale_price: 250000,
      purchase_price: 200000,
      commission_rate_bps: 2500,
      dealer_share: 12500,
      shop_share: 237500,
      seller_user_id: dealer.id,
      consignment_id: consignmentId,
    });
    expect(await deviceStatus(patron, deviceId)).toBe("SOLD");
    const { data: consignment } = await patron.client
      .from("consignments")
      .select("status")
      .single();
    expect(consignment?.status).toBe("SOLD");
  });

  it("à perte mais au-dessus du plancher : le dealer ne touche rien", async () => {
    const { patron, dealer, shopId } = await shopWithTeam();
    const deviceId = await createDevice(patron, { shop_id: shopId });
    await consign(patron, deviceId, await membershipId(patron, dealer.id), {
      floor_price: 100000,
    });

    const { sale } = await sell(dealer, deviceId, { sale_price: 150000 });
    expect(await saleRow(patron, sale.id)).toMatchObject({
      status: "COMPLETED",
      dealer_share: 0,
      shop_share: 150000,
    });
  });

  it("changer ensuite le taux ou le prix d'achat ne réécrit pas la vente", async () => {
    const { patron, dealer, deviceId, dealerMembership } = await shopWithConsignment();
    const { sale } = await sell(dealer, deviceId, { sale_price: 300000 });

    await patron.client.rpc("update_member", {
      p_membership_id: dealerMembership,
      p_role: "DEALER",
      p_commission_rate_bps: 9000,
      p_active: true,
    });
    await patron.client.from("devices").update({ purchase_price: 1 }).eq("id", deviceId);

    expect(await saleRow(patron, sale.id)).toMatchObject({
      purchase_price: 200000,
      commission_rate_bps: 2500,
      dealer_share: 25000,
      shop_share: 275000,
    });
  });

  it("le client créé à la vente est un client de la boutique", async () => {
    const { patron, dealer, cashier, deviceId, shopId } = await shopWithConsignment();
    const { sale } = await sell(dealer, deviceId, { customer_name: "  Mme Dossou  " });

    for (const user of [patron, cashier, dealer]) {
      const { data } = await user.client
        .from("customers")
        .select("id, name, shop_id, owner_user_id");
      expect(data).toEqual([
        { id: sale.customer_id, name: "Mme Dossou", shop_id: shopId, owner_user_id: null },
      ]);
    }
  });

  it("un appareil vendu ne se revend pas ; renvoyer la même vente ne la double pas", async () => {
    const { patron, dealer, deviceId } = await shopWithConsignment();
    const first = await sell(dealer, deviceId);

    const replay = await dealer.client.rpc("create_sale", {
      p_sale: first.sale,
      p_report: first.report,
      p_photos: first.photos,
    });
    expect(replay.error).toBeNull();
    expect(replay.data).toBe("COMPLETED");

    const report = reportPayload(deviceId);
    const again = await dealer.client.rpc("create_sale", {
      p_sale: { ...first.sale, id: crypto.randomUUID() },
      p_report: report,
      p_photos: [],
    });
    expect(again.error).not.toBeNull();
    expect((await patron.client.from("sales").select("id")).data).toHaveLength(1);
  });

  it("refuse une vente sans client, sans photos ou à prix négatif", async () => {
    const { patron, dealer, deviceId } = await shopWithConsignment();

    expect(
      (await sell(dealer, deviceId, { customer_name: "" })).error?.message,
    ).toBe("customer_required");
    expect((await sell(dealer, deviceId, { sale_price: -1 })).error?.message).toBe(
      "invalid_price",
    );

    const report = reportPayload(deviceId);
    const noPhotos = await dealer.client.rpc("create_sale", {
      p_sale: {
        id: crypto.randomUUID(),
        device_id: deviceId,
        sale_price: 250000,
        customer_id: crypto.randomUUID(),
        customer_name: "Client",
      },
      p_report: report,
      p_photos: [],
    });
    expect(noPhotos.error?.message).toBe("missing_photos");

    expect((await patron.client.from("sales").select("id")).data).toEqual([]);
    expect((await patron.client.from("customers").select("id")).data).toEqual([]);
    expect(await deviceStatus(patron, deviceId)).toBe("CONSIGNED");
  });
});

describe("vente sous le prix plancher", () => {
  it("reste en attente : pas de parts, l'appareil reste confié", async () => {
    const { patron, dealer, deviceId } = await shopWithConsignment();

    const { data: status, sale } = await sell(dealer, deviceId, { sale_price: 229999 });
    expect(status).toBe("PENDING_APPROVAL");
    expect(await saleRow(patron, sale.id)).toMatchObject({
      status: "PENDING_APPROVAL",
      shop_share: null,
      dealer_share: null,
    });
    expect(await deviceStatus(patron, deviceId)).toBe("CONSIGNED");
    const { data: consignment } = await patron.client
      .from("consignments")
      .select("status")
      .single();
    expect(consignment?.status).toBe("ACTIVE");
  });

  it("au prix plancher exact, la vente est validée d'office", async () => {
    const { dealer, deviceId } = await shopWithConsignment();
    expect((await sell(dealer, deviceId, { sale_price: 230000 })).data).toBe("COMPLETED");
  });

  it("le patron valide : les parts sont calculées et l'appareil est vendu", async () => {
    const { patron, dealer, deviceId } = await shopWithConsignment();
    const { sale } = await sell(dealer, deviceId, { sale_price: 220000 });

    const { error } = await patron.client.rpc("decide_sale", {
      p_sale_id: sale.id,
      p_approve: true,
    });
    expect(error).toBeNull();

    expect(await saleRow(dealer, sale.id)).toMatchObject({
      status: "COMPLETED",
      dealer_share: 5000,
      shop_share: 215000,
    });
    expect(await deviceStatus(patron, deviceId)).toBe("SOLD");
    const { data } = await patron.client.from("sales").select("decided_by").single();
    expect(data?.decided_by).toBe(patron.id);
  });

  it("le patron refuse : l'appareil reste confié et peut être revendu", async () => {
    const { patron, dealer, deviceId } = await shopWithConsignment();
    const { sale } = await sell(dealer, deviceId, { sale_price: 220000 });

    await patron.client.rpc("decide_sale", { p_sale_id: sale.id, p_approve: false });
    expect(await saleRow(patron, sale.id)).toMatchObject({
      status: "REJECTED",
      shop_share: null,
      dealer_share: null,
    });
    expect(await deviceStatus(patron, deviceId)).toBe("CONSIGNED");

    expect((await sell(dealer, deviceId, { sale_price: 240000 })).data).toBe("COMPLETED");
  });

  it("seul le patron décide, et une seule fois", async () => {
    const { patron, dealer, cashier, deviceId } = await shopWithConsignment();
    const other = await shopWithTeam();
    const { sale } = await sell(dealer, deviceId, { sale_price: 220000 });
    const decide = (user: TestUser) =>
      user.client.rpc("decide_sale", { p_sale_id: sale.id, p_approve: true });

    for (const user of [dealer, cashier, other.patron]) {
      expect((await decide(user)).error?.message).toBe("not_allowed");
    }
    expect((await decide(patron)).error).toBeNull();
    expect((await decide(patron)).error?.message).toBe("sale_not_pending");
  });

  it("tant qu'une vente attend, ni seconde vente ni retour", async () => {
    const { patron, dealer, deviceId, consignmentId } = await shopWithConsignment();
    await sell(dealer, deviceId, { sale_price: 220000 });

    expect((await sell(dealer, deviceId, { sale_price: 240000 })).error?.message).toBe(
      "device_unavailable",
    );

    const report = reportPayload(deviceId);
    const photos = await uploadPhotos(patron, deviceId, report.id);
    const returned = await patron.client.rpc("return_consignment", {
      p_consignment_id: consignmentId,
      p_report: report,
      p_photos: photos,
    });
    expect(returned.error?.message).toBe("sale_pending");
  });
});

describe("vente directe de la boutique", () => {
  it("le patron ou le caissier vend un appareil en stock : tout revient à la boutique", async () => {
    const { patron, cashier, shopId } = await shopWithTeam();

    for (const seller of [patron, cashier]) {
      const deviceId = await createDevice(patron, { shop_id: shopId });
      const { data: status, error, sale } = await sell(seller, deviceId, { sale_price: 260000 });
      expect(error).toBeNull();
      expect(status).toBe("COMPLETED");
      expect(await saleRow(patron, sale.id)).toEqual({
        type: "SHOP",
        status: "COMPLETED",
        sale_price: 260000,
        purchase_price: 200000,
        commission_rate_bps: 0,
        dealer_share: 0,
        shop_share: 260000,
        seller_user_id: seller.id,
        consignment_id: null,
      });
      expect(await deviceStatus(patron, deviceId)).toBe("SOLD");
    }
  });

  it("un dealer ne vend pas un appareil qui ne lui est pas confié", async () => {
    const { patron, dealer, shopId } = await shopWithTeam();
    const deviceId = await createDevice(patron, { shop_id: shopId });

    const report = reportPayload(deviceId);
    const { error } = await dealer.client.rpc("create_sale", {
      p_sale: {
        id: crypto.randomUUID(),
        device_id: deviceId,
        sale_price: 250000,
        customer_id: crypto.randomUUID(),
        customer_name: "Client",
      },
      p_report: report,
      p_photos: [],
    });
    expect(error?.message).toBe("not_allowed");
  });

  it("le patron et le caissier ne vendent pas à la place du dealer un appareil confié", async () => {
    const { patron, cashier, deviceId } = await shopWithConsignment();

    for (const user of [patron, cashier]) {
      expect((await sell(user, deviceId)).error?.message).toBe("not_allowed");
    }
    expect(await deviceStatus(patron, deviceId)).toBe("CONSIGNED");
  });

  it("un appareil retiré du stock ne se vend pas", async () => {
    const { patron, shopId } = await shopWithTeam();
    const deviceId = await createDevice(patron, { shop_id: shopId });
    await patron.client.rpc("set_device_withdrawn", {
      p_device_id: deviceId,
      p_withdrawn: true,
    });

    expect((await sell(patron, deviceId)).error?.message).toBe("device_unavailable");
  });
});

describe("vente perso : étanchéité avec la boutique", () => {
  it("tout revient au dealer, et la boutique ne voit ni la vente, ni le client, ni le constat", async () => {
    const { patron, dealer, cashier } = await shopWithConsignment();
    const personalDevice = await createDevice(dealer, { owner_user_id: dealer.id });

    const { data: status, sale, report, photos } = await sell(dealer, personalDevice, {
      sale_price: 520000,
      customer_name: "Client perso",
    });
    expect(status).toBe("COMPLETED");
    expect(await saleRow(dealer, sale.id)).toEqual({
      type: "PERSONAL",
      status: "COMPLETED",
      sale_price: 520000,
      purchase_price: 200000,
      commission_rate_bps: 0,
      dealer_share: 520000,
      shop_share: 0,
      seller_user_id: dealer.id,
      consignment_id: null,
    });

    const { data: customers } = await dealer.client
      .from("customers")
      .select("name, shop_id, owner_user_id");
    expect(customers).toEqual([
      { name: "Client perso", shop_id: null, owner_user_id: dealer.id },
    ]);

    for (const user of [patron, cashier]) {
      expect(await saleRow(user, sale.id)).toBeNull();
      expect((await user.client.from("sales").select("id")).data).toEqual([]);
      expect((await user.client.from("customers").select("id")).data).toEqual([]);
      expect(
        (await user.client.from("condition_reports").select("id").eq("id", report.id)).data,
      ).toEqual([]);
      expect(
        (await user.client.from("devices").select("id").eq("id", personalDevice)).data,
      ).toEqual([]);
      expect(
        (await user.client.storage.from("photos").download(photos[0].storage_key)).data,
      ).toBeNull();
    }
  });

  it("le dealer ne voit pas les ventes ni les clients perso du patron", async () => {
    const { patron, dealer, cashier } = await shopWithTeam();
    const personalDevice = await createDevice(patron, { owner_user_id: patron.id });
    const { sale } = await sell(patron, personalDevice);

    expect((await saleRow(patron, sale.id))?.type).toBe("PERSONAL");
    for (const user of [dealer, cashier]) {
      expect((await user.client.from("sales").select("id")).data).toEqual([]);
      expect((await user.client.from("customers").select("id")).data).toEqual([]);
    }
  });

  it("un client perso ne sert pas à une vente boutique, et inversement", async () => {
    const { patron, dealer, deviceId } = await shopWithConsignment();
    const personalDevice = await createDevice(dealer, { owner_user_id: dealer.id });
    const otherPersonal = await createDevice(dealer, { owner_user_id: dealer.id });

    const personalSale = await sell(dealer, personalDevice);
    const crossed = await sell(dealer, deviceId, {
      customer_id: personalSale.sale.customer_id,
      customer_name: "",
    });
    expect(crossed.error?.message).toBe("invalid_customer");

    const shopSale = await sell(dealer, deviceId);
    expect(shopSale.error).toBeNull();
    const reversed = await sell(dealer, otherPersonal, {
      customer_id: shopSale.sale.customer_id,
      customer_name: "",
    });
    expect(reversed.error?.message).toBe("invalid_customer");

    const { data } = await patron.client.from("customers").select("id");
    expect(data).toEqual([{ id: shopSale.sale.customer_id }]);
  });

  it("personne ne vend l'appareil perso d'un autre", async () => {
    const { patron, dealer } = await shopWithTeam();
    const personalDevice = await createDevice(dealer, { owner_user_id: dealer.id });

    const report = reportPayload(personalDevice);
    const { error } = await patron.client.rpc("create_sale", {
      p_sale: {
        id: crypto.randomUUID(),
        device_id: personalDevice,
        sale_price: 1,
        customer_id: crypto.randomUUID(),
        customer_name: "Client",
      },
      p_report: report,
      p_photos: [],
    });
    expect(error?.message).toBe("not_allowed");
  });
});

describe("qui voit quelles ventes de la boutique", () => {
  it("le patron et le caissier voient tout ; chaque dealer ne voit que les siennes", async () => {
    const { patron, dealer, cashier, deviceId, shopId } = await shopWithConsignment();
    const otherPhone = randomPhone();
    const otherDealer = await signUpUser("Autre dealer", { phone: otherPhone });
    await patron.client.rpc("add_member", {
      p_shop_id: shopId,
      p_role: "DEALER",
      p_commission_rate_bps: 4000,
      p_phone: otherPhone,
    });
    const otherDevice = await createDevice(patron, { shop_id: shopId });
    await consign(patron, otherDevice, await membershipId(patron, otherDealer.id));
    const directDevice = await createDevice(patron, { shop_id: shopId });

    const mine = await sell(dealer, deviceId);

    // Un dealer ne peut pas utiliser le client enregistré par un autre dealer.
    const borrowed = await sell(otherDealer, otherDevice, {
      customer_id: mine.sale.customer_id,
      customer_name: "",
    });
    expect(borrowed.error?.message).toBe("invalid_customer");

    const theirs = await sell(otherDealer, otherDevice, { sale_price: 300000 });
    const direct = await sell(cashier, directDevice);

    const ids = async (user: TestUser) =>
      ((await user.client.from("sales").select("id")).data ?? []).map((s) => s.id).sort();
    const all = [mine.sale.id, theirs.sale.id, direct.sale.id].sort();

    expect(await ids(patron)).toEqual(all);
    expect(await ids(cashier)).toEqual(all);
    expect(await ids(dealer)).toEqual([mine.sale.id]);
    expect(await ids(otherDealer)).toEqual([theirs.sale.id]);

    // Chaque dealer est payé à son propre taux.
    expect((await saleRow(patron, theirs.sale.id))?.dealer_share).toBe(40000);

    // Un dealer ne voit que les clients qu'il a lui-même enregistrés.
    expect((await dealer.client.from("customers").select("id")).data).toEqual([
      { id: mine.sale.customer_id },
    ]);
  });

  it("une autre boutique et un inconnu ne voient rien", async () => {
    const a = await shopWithConsignment();
    await sell(a.dealer, a.deviceId);
    const b = await shopWithTeam();
    const stranger = await signUpUser("Inconnu", { email: randomEmail() });

    for (const user of [b.patron, b.dealer, b.cashier, stranger]) {
      expect((await user.client.from("sales").select("id")).data).toEqual([]);
      expect((await user.client.from("customers").select("id")).data).toEqual([]);
    }
  });

  it("un dealer désactivé ne voit plus ses ventes boutique, mais garde ses ventes perso", async () => {
    const { patron, dealer, deviceId, dealerMembership } = await shopWithConsignment();
    await sell(dealer, deviceId);
    const personalDevice = await createDevice(dealer, { owner_user_id: dealer.id });
    const personal = await sell(dealer, personalDevice);

    await patron.client.rpc("update_member", {
      p_membership_id: dealerMembership,
      p_role: "DEALER",
      p_commission_rate_bps: 2500,
      p_active: false,
    });

    expect((await dealer.client.from("sales").select("id")).data).toEqual([
      { id: personal.sale.id },
    ]);
  });
});

describe("écritures directes", () => {
  it("personne ne crée ni ne modifie une vente ou un client sans passer par les opérations", async () => {
    const { patron, dealer, deviceId, shopId } = await shopWithConsignment();
    const { sale } = await sell(dealer, deviceId);

    for (const user of [patron, dealer]) {
      const changes = [
        user.client.from("sales").update({ dealer_share: 250000, shop_share: 0 }).eq("id", sale.id),
        user.client.from("sales").delete().eq("id", sale.id),
        user.client.from("customers").update({ name: "Autre" }).eq("id", sale.customer_id),
        user.client.from("customers").delete().eq("id", sale.customer_id),
        user.client
          .from("customers")
          .insert({ shop_id: shopId, name: "Direct", created_by: user.id }),
        user.client.from("devices").update({ status: "IN_STOCK" }).eq("id", deviceId),
      ];
      for (const change of changes) {
        expect((await change).error).not.toBeNull();
      }
    }
    expect(await saleRow(patron, sale.id)).toMatchObject({
      dealer_share: 12500,
      shop_share: 237500,
    });
  });
});
