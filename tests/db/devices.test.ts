import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createDevice,
  createReport,
  createShop,
  deviceRow,
  randomEmail,
  randomImei,
  reportPayload,
  shopWithTeam,
  signUpUser,
  uploadPhotos,
} from "./helpers";

describe("création d'un appareil", () => {
  it("refuse un IMEI invalide", async () => {
    const user = await signUpUser("Awa", { email: randomEmail() });
    const valid = randomImei();
    const wrongKey = valid.slice(0, 14) + ((Number(valid[14]) + 1) % 10);

    for (const imei of [wrongKey, "12345", valid + "0", "49015420323751a"]) {
      const { error } = await user.client
        .from("devices")
        .insert(deviceRow({ owner_user_id: user.id }, { imei }));
      expect(error, imei).not.toBeNull();
    }
    expect((await user.client.from("devices").select("id")).data).toEqual([]);
  });

  it("refuse un IMEI déjà enregistré, même par quelqu'un d'autre", async () => {
    const awa = await signUpUser("Awa", { email: randomEmail() });
    const koffi = await signUpUser("Koffi", { email: randomEmail() });
    const imei = randomImei();

    const first = await awa.client
      .from("devices")
      .insert(deviceRow({ owner_user_id: awa.id }, { imei }));
    expect(first.error).toBeNull();

    const second = await koffi.client
      .from("devices")
      .insert(deviceRow({ owner_user_id: koffi.id }, { imei }));
    expect(second.error?.code).toBe("23505");
  });

  it("exige exactement un propriétaire : boutique ou utilisateur", async () => {
    const patron = await signUpUser("Patron", { email: randomEmail() });
    const shopId = await createShop(patron.client, "Boutique A");

    const both = await patron.client
      .from("devices")
      .insert(deviceRow({ shop_id: shopId }, { owner_user_id: patron.id }));
    expect(both.error).not.toBeNull();

    const none = await patron.client
      .from("devices")
      .insert(deviceRow({ shop_id: shopId }, { shop_id: null }));
    expect(none.error).not.toBeNull();
  });

  it("refuse un prix négatif", async () => {
    const user = await signUpUser("Awa", { email: randomEmail() });
    const { error } = await user.client
      .from("devices")
      .insert(deviceRow({ owner_user_id: user.id }, { purchase_price: -1 }));
    expect(error).not.toBeNull();
  });

  it("seul le patron ajoute un appareil au stock de la boutique", async () => {
    const { patron, dealer, cashier, shopId } = await shopWithTeam();
    const stranger = await signUpUser("Inconnu", { email: randomEmail() });

    for (const user of [dealer, cashier, stranger]) {
      const { error } = await user.client
        .from("devices")
        .insert(deviceRow({ shop_id: shopId }));
      expect(error).not.toBeNull();
    }

    await createDevice(patron, { shop_id: shopId });
    expect((await patron.client.from("devices").select("id")).data).toHaveLength(1);
  });

  it("personne n'ajoute un appareil dans l'espace perso d'un autre", async () => {
    const awa = await signUpUser("Awa", { email: randomEmail() });
    const koffi = await signUpUser("Koffi", { email: randomEmail() });

    const { error } = await koffi.client
      .from("devices")
      .insert(deviceRow({ owner_user_id: awa.id }));
    expect(error).not.toBeNull();
    expect((await awa.client.from("devices").select("id")).data).toEqual([]);
  });
});

describe("étanchéité des appareils", () => {
  it("le patron ne voit jamais l'appareil perso de son dealer", async () => {
    const { patron, dealer, cashier, shopId } = await shopWithTeam();
    const shopDevice = await createDevice(patron, { shop_id: shopId });
    const personalDevice = await createDevice(dealer, { owner_user_id: dealer.id });
    const { report, photos } = await createReport(dealer, personalDevice);

    for (const user of [patron, cashier]) {
      expect((await user.client.from("devices").select("id")).data).toEqual([
        { id: shopDevice },
      ]);
      expect(
        (await user.client.from("devices").select("id").eq("id", personalDevice)).data,
      ).toEqual([]);
      expect((await user.client.from("condition_reports").select("id")).data).toEqual([]);
      expect((await user.client.from("photos").select("id")).data).toEqual([]);

      const download = await user.client.storage
        .from("photos")
        .download(photos[0].storage_key);
      expect(download.data).toBeNull();
      const signed = await user.client.storage
        .from("photos")
        .createSignedUrl(photos[0].storage_key, 60);
      expect(signed.data).toBeNull();
    }

    const mine = await dealer.client.from("condition_reports").select("id");
    expect(mine.data).toEqual([{ id: report.id }]);
  });

  it("le dealer ne voit pas le stock de la boutique ; le caissier le voit", async () => {
    const { patron, dealer, cashier, shopId } = await shopWithTeam();
    const deviceId = await createDevice(patron, { shop_id: shopId });
    const { photos } = await createReport(patron, deviceId);

    expect((await dealer.client.from("devices").select("id")).data).toEqual([]);
    expect((await dealer.client.from("condition_reports").select("id")).data).toEqual([]);
    expect((await dealer.client.from("photos").select("id")).data).toEqual([]);
    expect(
      (await dealer.client.storage.from("photos").download(photos[0].storage_key)).data,
    ).toBeNull();

    expect((await cashier.client.from("devices").select("id")).data).toEqual([
      { id: deviceId },
    ]);
    expect((await cashier.client.from("photos").select("id")).data).toHaveLength(4);
    expect(
      (await cashier.client.storage.from("photos").download(photos[0].storage_key)).data,
    ).not.toBeNull();
  });

  it("une boutique ne voit pas le stock d'une autre", async () => {
    const a = await shopWithTeam();
    const b = await shopWithTeam();
    const deviceA = await createDevice(a.patron, { shop_id: a.shopId });
    await createDevice(b.patron, { shop_id: b.shopId });

    expect((await a.patron.client.from("devices").select("id")).data).toEqual([
      { id: deviceA },
    ]);
  });

  it("un membre désactivé ne voit plus le stock", async () => {
    const { patron, cashier, shopId } = await shopWithTeam();
    await createDevice(patron, { shop_id: shopId });
    const { data: row } = await patron.client
      .from("memberships")
      .select("id")
      .eq("user_id", cashier.id)
      .single();
    await patron.client.rpc("update_member", {
      p_membership_id: row!.id,
      p_role: "CASHIER",
      p_commission_rate_bps: 0,
      p_active: false,
    });

    expect((await cashier.client.from("devices").select("id")).data).toEqual([]);
  });
});

describe("modification d'un appareil", () => {
  it("le propriétaire corrige le modèle et les prix, pas l'IMEI, le statut ni le propriétaire", async () => {
    const { patron, shopId } = await shopWithTeam();
    const deviceId = await createDevice(patron, { shop_id: shopId });
    const update = (values: Record<string, unknown>) =>
      patron.client.from("devices").update(values).eq("id", deviceId);

    expect((await update({ model: "iPhone 14", target_price: 300000 })).error).toBeNull();
    expect((await update({ imei: randomImei() })).error).not.toBeNull();
    expect((await update({ status: "SOLD" })).error).not.toBeNull();
    expect((await update({ shop_id: null, owner_user_id: patron.id })).error).not.toBeNull();

    const { data } = await patron.client
      .from("devices")
      .select("model, target_price, status, shop_id")
      .single();
    expect(data).toEqual({
      model: "iPhone 14",
      target_price: 300000,
      status: "IN_STOCK",
      shop_id: shopId,
    });
  });

  it("le caissier ne modifie pas un appareil", async () => {
    const { patron, cashier, shopId } = await shopWithTeam();
    const deviceId = await createDevice(patron, { shop_id: shopId });

    await cashier.client.from("devices").update({ target_price: 1 }).eq("id", deviceId);
    const withdrawn = await cashier.client.rpc("set_device_withdrawn", {
      p_device_id: deviceId,
      p_withdrawn: true,
    });
    expect(withdrawn.error?.message).toBe("not_allowed");

    const { data } = await patron.client
      .from("devices")
      .select("target_price, status")
      .single();
    expect(data).toEqual({ target_price: 250000, status: "IN_STOCK" });
  });

  it("le propriétaire retire un appareil du stock puis le remet", async () => {
    const user = await signUpUser("Awa", { email: randomEmail() });
    const deviceId = await createDevice(user, { owner_user_id: user.id });
    const setWithdrawn = (withdrawn: boolean) =>
      user.client.rpc("set_device_withdrawn", {
        p_device_id: deviceId,
        p_withdrawn: withdrawn,
      });
    const status = async () =>
      (await user.client.from("devices").select("status").single()).data?.status;

    expect((await setWithdrawn(true)).error).toBeNull();
    expect(await status()).toBe("WITHDRAWN");
    expect((await setWithdrawn(true)).error?.message).toBe("invalid_status");
    expect((await setWithdrawn(false)).error).toBeNull();
    expect(await status()).toBe("IN_STOCK");
  });
});

describe("constats d'état", () => {
  it("enregistre un constat avec ses quatre photos obligatoires", async () => {
    const user = await signUpUser("Awa", { email: randomEmail() });
    const deviceId = await createDevice(user, { owner_user_id: user.id });
    const { report } = await createReport(user, deviceId);

    const { data } = await user.client
      .from("condition_reports")
      .select("id, type, grade, battery_health, past_repairs, accessories, created_by, photos(angle)")
      .single();
    expect(data).toMatchObject({
      id: report.id,
      type: "INTAKE",
      grade: "GOOD",
      battery_health: 87,
      past_repairs: ["BATTERY"],
      accessories: ["BOX", "CABLE"],
      created_by: user.id,
    });
    expect(data!.photos.map((p) => p.angle).sort()).toEqual([
      "ABOUT",
      "BACK",
      "FRONT",
      "SCREEN_ON",
    ]);
  });

  it("refuse un constat auquel il manque une photo obligatoire", async () => {
    const user = await signUpUser("Awa", { email: randomEmail() });
    const deviceId = await createDevice(user, { owner_user_id: user.id });
    const report = reportPayload(deviceId);
    const photos = await uploadPhotos(user, deviceId, report.id, [
      "FRONT",
      "BACK",
      "SCREEN_ON",
      "DEFECT",
    ]);

    const { error } = await user.client.rpc("create_intake_report", {
      p_report: report,
      p_photos: photos,
    });
    expect(error?.message).toBe("missing_photos");
    expect((await user.client.from("condition_reports").select("id")).data).toEqual([]);
  });

  it("refuse une photo qui n'a pas été envoyée ou qui vient d'un autre appareil", async () => {
    const user = await signUpUser("Awa", { email: randomEmail() });
    const deviceId = await createDevice(user, { owner_user_id: user.id });
    const otherDevice = await createDevice(user, { owner_user_id: user.id });
    const report = reportPayload(deviceId);
    const photos = await uploadPhotos(user, deviceId, report.id);

    const notUploaded = photos.map((p, i) =>
      i === 0 ? { ...p, storage_key: `${deviceId}/${report.id}/${randomUUID()}` } : p,
    );
    const first = await user.client.rpc("create_intake_report", {
      p_report: report,
      p_photos: notUploaded,
    });
    expect(first.error?.message).toBe("photo_not_uploaded");

    const elsewhere = await uploadPhotos(user, otherDevice, report.id);
    const second = await user.client.rpc("create_intake_report", {
      p_report: report,
      p_photos: elsewhere,
    });
    expect(second.error?.message).toBe("photo_not_uploaded");
  });

  it("refuse des valeurs hors liste", async () => {
    const user = await signUpUser("Awa", { email: randomEmail() });
    const deviceId = await createDevice(user, { owner_user_id: user.id });

    for (const overrides of [
      { battery_health: 140 },
      { screen_condition: "N'IMPORTE QUOI" },
      { accessories: ["VOITURE"] },
      { grade: "PARFAIT" },
    ]) {
      const report = reportPayload(deviceId, overrides);
      const photos = await uploadPhotos(user, deviceId, report.id);
      const { error } = await user.client.rpc("create_intake_report", {
        p_report: report,
        p_photos: photos,
      });
      expect(error, JSON.stringify(overrides)).not.toBeNull();
    }
    expect((await user.client.from("condition_reports").select("id")).data).toEqual([]);
  });

  it("renvoyer deux fois le même constat n'en crée qu'un", async () => {
    const user = await signUpUser("Awa", { email: randomEmail() });
    const deviceId = await createDevice(user, { owner_user_id: user.id });
    const { report, photos } = await createReport(user, deviceId);

    const again = await user.client.rpc("create_intake_report", {
      p_report: report,
      p_photos: photos,
    });
    expect(again.error).toBeNull();
    expect((await user.client.from("condition_reports").select("id")).data).toHaveLength(1);
    expect((await user.client.from("photos").select("id")).data).toHaveLength(4);
  });

  it("constats et photos sont immuables", async () => {
    const user = await signUpUser("Awa", { email: randomEmail() });
    const deviceId = await createDevice(user, { owner_user_id: user.id });
    const { report, photos } = await createReport(user, deviceId);

    const changes = [
      user.client.from("condition_reports").update({ grade: "NEW" }).eq("id", report.id),
      user.client.from("condition_reports").delete().eq("id", report.id),
      user.client.from("photos").update({ angle: "DEFECT" }).eq("report_id", report.id),
      user.client.from("photos").delete().eq("report_id", report.id),
    ];
    for (const change of changes) {
      expect((await change).error).not.toBeNull();
    }

    const storage = user.client.storage.from("photos");
    await storage.remove([photos[0].storage_key]);
    const overwrite = await storage.upload(
      photos[0].storage_key,
      new Blob(["autre image"], { type: "image/jpeg" }),
      { upsert: true },
    );
    expect(overwrite.error).not.toBeNull();
    const kept = await storage.download(photos[0].storage_key);
    expect(await kept.data?.text()).toBe("image de test");

    const { data } = await user.client
      .from("condition_reports")
      .select("grade, photos(angle)")
      .single();
    expect(data?.grade).toBe("GOOD");
    expect(data?.photos).toHaveLength(4);
  });

  it("une correction crée un nouveau constat sans toucher à l'ancien", async () => {
    const user = await signUpUser("Awa", { email: randomEmail() });
    const deviceId = await createDevice(user, { owner_user_id: user.id });
    await createReport(user, deviceId);
    await createReport(user, deviceId);

    expect((await user.client.from("condition_reports").select("id")).data).toHaveLength(2);
    expect((await user.client.from("photos").select("id")).data).toHaveLength(8);
  });

  it("seul celui qui peut modifier l'appareil crée un constat ou envoie une photo", async () => {
    const { patron, dealer, cashier, shopId } = await shopWithTeam();
    const deviceId = await createDevice(patron, { shop_id: shopId });
    const report = reportPayload(deviceId);
    const photos = await uploadPhotos(patron, deviceId, report.id);

    for (const user of [dealer, cashier]) {
      const upload = await user.client.storage
        .from("photos")
        .upload(
          `${deviceId}/${report.id}/${randomUUID()}`,
          new Blob(["x"], { type: "image/jpeg" }),
        );
      expect(upload.error).not.toBeNull();

      const created = await user.client.rpc("create_intake_report", {
        p_report: report,
        p_photos: photos,
      });
      expect(created.error?.message).toBe("not_allowed");
    }
  });

  it("le stockage refuse autre chose qu'une image", async () => {
    const user = await signUpUser("Awa", { email: randomEmail() });
    const deviceId = await createDevice(user, { owner_user_id: user.id });

    const { error } = await user.client.storage
      .from("photos")
      .upload(
        `${deviceId}/${randomUUID()}/${randomUUID()}`,
        new Blob(["<script>"], { type: "text/html" }),
      );
    expect(error).not.toBeNull();
  });
});
