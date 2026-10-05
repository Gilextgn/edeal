import { describe, expect, it } from "vitest";
import {
  consign,
  createDevice,
  createReport,
  membershipId,
  randomEmail,
  randomPhone,
  reportPayload,
  sell,
  shopWithConsignment,
  shopWithTeam,
  signUpUser,
  uploadPhotos,
} from "./helpers";

describe("confier un appareil", () => {
  it("le patron confie un appareil : il passe en dépôt actif avec son constat de remise", async () => {
    const { patron, dealer, deviceId, consignmentId, handoverReportId } =
      await shopWithConsignment();

    const { data: consignment } = await patron.client
      .from("consignments")
      .select("id, status, dealer_user_id, floor_price, handover_report_id, return_report_id")
      .single();
    expect(consignment).toEqual({
      id: consignmentId,
      status: "ACTIVE",
      dealer_user_id: dealer.id,
      floor_price: 230000,
      handover_report_id: handoverReportId,
      return_report_id: null,
    });

    const { data: device } = await patron.client
      .from("devices")
      .select("status")
      .eq("id", deviceId)
      .single();
    expect(device?.status).toBe("CONSIGNED");

    const { data: report } = await patron.client
      .from("condition_reports")
      .select("type, photos(id)")
      .eq("id", handoverReportId)
      .single();
    expect(report?.type).toBe("HANDOVER");
    expect(report?.photos).toHaveLength(4);
  });

  it("un appareil ne peut avoir qu'un seul dépôt actif", async () => {
    const { patron, deviceId, dealerMembership } = await shopWithConsignment();

    const second = await consign(patron, deviceId, dealerMembership);
    expect(second.error?.message).toBe("device_unavailable");
    expect((await patron.client.from("consignments").select("id")).data).toHaveLength(1);
  });

  it("seul le patron confie un appareil", async () => {
    const { patron, dealer, cashier, shopId } = await shopWithTeam();
    const deviceId = await createDevice(patron, { shop_id: shopId });
    const dealerMembership = await membershipId(patron, dealer.id);

    for (const user of [dealer, cashier]) {
      const report = reportPayload(deviceId);
      const { error } = await user.client.rpc("create_consignment", {
        p_consignment: {
          id: crypto.randomUUID(),
          device_id: deviceId,
          membership_id: dealerMembership,
          due_on: "2099-01-01",
          floor_price: 1,
        },
        p_report: report,
        p_photos: [],
      });
      expect(error?.message).toBe("not_allowed");
    }
    expect((await patron.client.from("consignments").select("id")).data).toEqual([]);
  });

  it("on ne confie qu'à un dealer actif de la même boutique", async () => {
    const a = await shopWithTeam();
    const b = await shopWithTeam();
    const deviceId = await createDevice(a.patron, { shop_id: a.shopId });

    const toCashier = await consign(a.patron, deviceId, await membershipId(a.patron, a.cashier.id));
    expect(toCashier.error?.message).toBe("invalid_dealer");

    const toOtherShop = await consign(
      a.patron,
      deviceId,
      await membershipId(b.patron, b.dealer.id),
    );
    expect(toOtherShop.error?.message).toBe("invalid_dealer");

    const dealerMembership = await membershipId(a.patron, a.dealer.id);
    await a.patron.client.rpc("update_member", {
      p_membership_id: dealerMembership,
      p_role: "DEALER",
      p_commission_rate_bps: 2500,
      p_active: false,
    });
    const toInactive = await consign(a.patron, deviceId, dealerMembership);
    expect(toInactive.error?.message).toBe("invalid_dealer");
  });

  it("refuse une date limite passée, un plancher négatif, un appareil perso", async () => {
    const { patron, dealer, shopId } = await shopWithTeam();
    const deviceId = await createDevice(patron, { shop_id: shopId });
    const personal = await createDevice(patron, { owner_user_id: patron.id });
    const dealerMembership = await membershipId(patron, dealer.id);

    expect(
      (await consign(patron, deviceId, dealerMembership, { due_on: "2020-01-01" })).error
        ?.message,
    ).toBe("invalid_due_date");
    expect(
      (await consign(patron, deviceId, dealerMembership, { floor_price: -1 })).error?.message,
    ).toBe("invalid_price");
    expect((await consign(patron, personal, dealerMembership)).error?.message).toBe(
      "not_allowed",
    );
  });

  it("sans les photos obligatoires, rien n'est enregistré", async () => {
    const { patron, dealer, shopId } = await shopWithTeam();
    const deviceId = await createDevice(patron, { shop_id: shopId });
    const report = reportPayload(deviceId);
    const photos = await uploadPhotos(patron, deviceId, report.id, ["FRONT", "BACK"]);

    const { error } = await patron.client.rpc("create_consignment", {
      p_consignment: {
        id: crypto.randomUUID(),
        device_id: deviceId,
        membership_id: await membershipId(patron, dealer.id),
        due_on: "2099-01-01",
        floor_price: 230000,
      },
      p_report: report,
      p_photos: photos,
    });
    expect(error?.message).toBe("missing_photos");

    expect((await patron.client.from("consignments").select("id")).data).toEqual([]);
    expect((await patron.client.from("condition_reports").select("id")).data).toEqual([]);
    const { data: device } = await patron.client.from("devices").select("status").single();
    expect(device?.status).toBe("IN_STOCK");
  });

  it("renvoyer deux fois le même dépôt n'en crée qu'un", async () => {
    const { patron, dealer, shopId } = await shopWithTeam();
    const deviceId = await createDevice(patron, { shop_id: shopId });
    const first = await consign(patron, deviceId, await membershipId(patron, dealer.id));
    expect(first.error).toBeNull();

    const replay = await patron.client.rpc("create_consignment", {
      p_consignment: first.consignment,
      p_report: first.report,
      p_photos: first.photos,
    });
    expect(replay.error).toBeNull();
    expect((await patron.client.from("consignments").select("id")).data).toHaveLength(1);
  });
});

describe("ce que voit le dealer", () => {
  it("son dépôt, l'appareil et le constat de remise — pas les autres constats", async () => {
    const { patron, dealer, shopId } = await shopWithTeam();
    const deviceId = await createDevice(patron, { shop_id: shopId });
    const other = await createDevice(patron, { shop_id: shopId });
    await createReport(patron, deviceId);
    const { report, photos, consignment } = await consign(
      patron,
      deviceId,
      await membershipId(patron, dealer.id),
    );

    expect((await dealer.client.from("consignments").select("id")).data).toEqual([
      { id: consignment.id },
    ]);
    expect((await dealer.client.from("devices").select("id")).data).toEqual([{ id: deviceId }]);
    expect(
      (await dealer.client.from("devices").select("id").eq("id", other)).data,
    ).toEqual([]);

    expect((await dealer.client.from("condition_reports").select("id")).data).toEqual([
      { id: report.id },
    ]);
    expect((await dealer.client.from("photos").select("id")).data).toHaveLength(4);
    const download = await dealer.client.storage.from("photos").download(photos[0].storage_key);
    expect(download.data).not.toBeNull();
  });

  it("un autre dealer de la boutique ne voit rien de ce dépôt", async () => {
    const { patron, shopId, deviceId, handoverReportId } = await shopWithConsignment();
    const otherPhone = randomPhone();
    const other = await signUpUser("Autre dealer", { phone: otherPhone });
    await patron.client.rpc("add_member", {
      p_shop_id: shopId,
      p_role: "DEALER",
      p_commission_rate_bps: 2000,
      p_phone: otherPhone,
    });

    expect((await other.client.from("consignments").select("id")).data).toEqual([]);
    expect((await other.client.from("devices").select("id")).data).toEqual([]);
    expect((await other.client.from("condition_reports").select("id")).data).toEqual([]);
    expect(
      (await other.client.from("condition_reports").select("id").eq("id", handoverReportId))
        .data,
    ).toEqual([]);
    expect((await sell(other, deviceId).catch((e) => ({ error: e }))).error).toBeTruthy();
  });

  it("le caissier ne voit pas les dépôts ; une autre boutique non plus", async () => {
    const a = await shopWithConsignment();
    const b = await shopWithTeam();

    expect((await a.cashier.client.from("consignments").select("id")).data).toEqual([]);
    for (const user of [b.patron, b.dealer, b.cashier]) {
      expect((await user.client.from("consignments").select("id")).data).toEqual([]);
    }
  });

  it("un dealer désactivé ne voit plus son dépôt ni l'appareil", async () => {
    const { patron, dealer, dealerMembership } = await shopWithConsignment();
    await patron.client.rpc("update_member", {
      p_membership_id: dealerMembership,
      p_role: "DEALER",
      p_commission_rate_bps: 2500,
      p_active: false,
    });

    expect((await dealer.client.from("consignments").select("id")).data).toEqual([]);
    expect((await dealer.client.from("devices").select("id")).data).toEqual([]);
    expect((await dealer.client.from("condition_reports").select("id")).data).toEqual([]);
  });
});

describe("retour d'un appareil confié", () => {
  async function returnDevice(
    user: Awaited<ReturnType<typeof shopWithConsignment>>["patron"],
    deviceId: string,
    consignmentId: string,
  ) {
    const report = reportPayload(deviceId);
    const photos = await uploadPhotos(user, deviceId, report.id).catch(() => []);
    const result = await user.client.rpc("return_consignment", {
      p_consignment_id: consignmentId,
      p_report: report,
      p_photos: photos,
    });
    return { ...result, report, photos };
  }

  it("le patron enregistre le retour : l'appareil revient en stock", async () => {
    const { patron, dealer, deviceId, consignmentId } = await shopWithConsignment();

    const { error, report } = await returnDevice(patron, deviceId, consignmentId);
    expect(error).toBeNull();

    const { data: consignment } = await patron.client
      .from("consignments")
      .select("status, return_report_id")
      .single();
    expect(consignment).toEqual({ status: "RETURNED", return_report_id: report.id });
    const { data: device } = await patron.client.from("devices").select("status").single();
    expect(device?.status).toBe("IN_STOCK");

    // Le dealer garde la trace du constat de retour, preuve de l'état rendu.
    const { data: reports } = await dealer.client.from("condition_reports").select("type");
    expect(reports?.map((r) => r.type).sort()).toEqual(["HANDOVER", "RETURN"]);
  });

  it("le dealer ne peut pas enregistrer lui-même le retour", async () => {
    const { patron, dealer, deviceId, consignmentId } = await shopWithConsignment();

    const { error } = await returnDevice(dealer, deviceId, consignmentId);
    expect(error?.message).toBe("not_allowed");
    const { data } = await patron.client.from("consignments").select("status").single();
    expect(data?.status).toBe("ACTIVE");
  });

  it("après le retour, le dealer ne peut plus vendre l'appareil", async () => {
    const { patron, dealer, deviceId, consignmentId } = await shopWithConsignment();
    await returnDevice(patron, deviceId, consignmentId);

    const report = reportPayload(deviceId);
    const upload = await dealer.client.storage
      .from("photos")
      .upload(
        `${deviceId}/${report.id}/${crypto.randomUUID()}`,
        new Blob(["x"], { type: "image/jpeg" }),
      );
    expect(upload.error).not.toBeNull();

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

  it("un appareil rendu peut être confié de nouveau", async () => {
    const { patron, deviceId, consignmentId, dealerMembership } = await shopWithConsignment();
    await returnDevice(patron, deviceId, consignmentId);

    expect((await consign(patron, deviceId, dealerMembership)).error).toBeNull();
    const { data } = await patron.client.from("consignments").select("status");
    expect(data?.map((c) => c.status).sort()).toEqual(["ACTIVE", "RETURNED"]);
  });

  it("un retour ne s'enregistre qu'une fois", async () => {
    const { patron, deviceId, consignmentId } = await shopWithConsignment();
    const first = await returnDevice(patron, deviceId, consignmentId);

    const replay = await patron.client.rpc("return_consignment", {
      p_consignment_id: consignmentId,
      p_report: first.report,
      p_photos: first.photos,
    });
    expect(replay.error).toBeNull();

    const again = await returnDevice(patron, deviceId, consignmentId);
    expect(again.error?.message).toBe("consignment_closed");
  });
});

describe("écritures directes", () => {
  it("personne ne modifie un dépôt sans passer par les opérations", async () => {
    const { patron, dealer, deviceId, consignmentId, dealerMembership, shopId } =
      await shopWithConsignment();

    for (const user of [patron, dealer]) {
      const changes = [
        user.client.from("consignments").update({ floor_price: 1 }).eq("id", consignmentId),
        user.client.from("consignments").delete().eq("id", consignmentId),
        user.client.from("consignments").insert({
          id: crypto.randomUUID(),
          device_id: deviceId,
          shop_id: shopId,
          membership_id: dealerMembership,
          dealer_user_id: dealer.id,
          handover_report_id: crypto.randomUUID(),
          due_on: "2099-01-01",
          floor_price: 0,
          created_by: user.id,
        }),
      ];
      for (const change of changes) {
        expect((await change).error).not.toBeNull();
      }
    }
    const { data } = await patron.client.from("consignments").select("floor_price").single();
    expect(data?.floor_price).toBe(230000);
  });

  it("un inconnu ne voit aucun dépôt", async () => {
    await shopWithConsignment();
    const stranger = await signUpUser("Inconnu", { email: randomEmail() });
    expect((await stranger.client.from("consignments").select("id")).data).toEqual([]);
  });
});
