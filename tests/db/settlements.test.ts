import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { allocateSettlement, dealerBalance } from "../../src/domain/settlement";
import {
  consign,
  createDevice,
  membershipId,
  randomEmail,
  randomPhone,
  sell,
  shopWithTeam,
  signUpUser,
  type TestUser,
} from "./helpers";

// Prix d'achat 200 000, taux du dealer 25 %.
// Vente à 250 000 → part boutique 237 500 ; à 300 000 → 275 000 ; à 240 000 → 230 000.

async function shopWithSales(prices: number[]) {
  const team = await shopWithTeam();
  const dealerMembership = await membershipId(team.patron, team.dealer.id);
  const saleIds: string[] = [];
  for (const sale_price of prices) {
    const deviceId = await createDevice(team.patron, { shop_id: team.shopId });
    await consign(team.patron, deviceId, dealerMembership, { floor_price: 0 });
    const { sale, error } = await sell(team.dealer, deviceId, { sale_price });
    if (error) throw new Error(`Vente de test impossible : ${error.message}`);
    saleIds.push(sale.id);
  }
  return { ...team, dealerMembership, saleIds };
}

function settle(
  user: TestUser,
  membership: string,
  amount: number,
  extra: Record<string, unknown> = {},
) {
  const settlement = {
    id: randomUUID(),
    membership_id: membership,
    amount,
    method: "CASH",
    ...extra,
  };
  return user.client
    .rpc("record_settlement", { p_settlement: settlement })
    .then((result) => ({ ...result, settlement }));
}

async function balanceOf(user: TestUser, shopId: string, membership: string) {
  const { data } = await user.client.rpc("dealer_balances", { p_shop_id: shopId });
  return (data as { membership_id: string; total_owed: number; total_settled: number; balance: number }[])
    ?.find((row) => row.membership_id === membership);
}

async function duesOf(user: TestUser, membership: string) {
  const { data } = await user.client
    .from("sale_dues")
    .select("sale_id, shop_share, settled, due, sold_at")
    .eq("membership_id", membership)
    .order("sold_at");
  return data ?? [];
}

describe("solde dû par un dealer", () => {
  it("vaut la somme des parts boutique de ses ventes en dépôt", async () => {
    const { patron, shopId, dealerMembership } = await shopWithSales([250000, 300000]);

    expect(await balanceOf(patron, shopId, dealerMembership)).toMatchObject({
      total_owed: 512500,
      total_settled: 0,
      balance: 512500,
    });
    expect(dealerBalance([237500, 275000], [])).toBe(512500);
  });

  it("diminue de chaque règlement, jusqu'à zéro", async () => {
    const { patron, shopId, dealerMembership } = await shopWithSales([250000, 300000]);

    expect((await settle(patron, dealerMembership, 200000)).error).toBeNull();
    expect((await balanceOf(patron, shopId, dealerMembership))?.balance).toBe(312500);
    expect(dealerBalance([237500, 275000], [200000])).toBe(312500);

    expect((await settle(patron, dealerMembership, 312500)).error).toBeNull();
    expect(await balanceOf(patron, shopId, dealerMembership)).toMatchObject({
      total_owed: 512500,
      total_settled: 512500,
      balance: 0,
    });
  });

  it("ne compte ni les ventes directes, ni les ventes perso, ni les ventes en attente", async () => {
    const { patron, dealer, cashier, shopId, dealerMembership } = await shopWithSales([250000]);

    const direct = await createDevice(patron, { shop_id: shopId });
    await sell(cashier, direct, { sale_price: 400000 });
    const personal = await createDevice(dealer, { owner_user_id: dealer.id });
    await sell(dealer, personal, { sale_price: 500000 });
    const pending = await createDevice(patron, { shop_id: shopId });
    await consign(patron, pending, dealerMembership, { floor_price: 300000 });
    const waiting = await sell(dealer, pending, { sale_price: 250000 });
    expect(waiting.data).toBe("PENDING_APPROVAL");

    expect((await balanceOf(patron, shopId, dealerMembership))?.balance).toBe(237500);

    // Une fois validée par le patron, la vente entre dans le solde.
    await patron.client.rpc("decide_sale", { p_sale_id: waiting.sale.id, p_approve: true });
    expect((await balanceOf(patron, shopId, dealerMembership))?.balance).toBe(475000);
  });

  it("un dealer sans vente a un solde nul", async () => {
    const { patron, dealer, shopId } = await shopWithTeam();
    const membership = await membershipId(patron, dealer.id);
    expect((await balanceOf(patron, shopId, membership))?.balance).toBe(0);
  });
});

describe("répartition d'un règlement sur les ventes", () => {
  it("solde les ventes les plus anciennes d'abord, comme le calcul de l'application", async () => {
    const { patron, dealerMembership, saleIds } = await shopWithSales([250000, 300000, 240000]);
    const before = await duesOf(patron, dealerMembership);
    const expected = allocateSettlement(
      300000,
      before.map((d) => ({ saleId: d.sale_id!, due: d.due!, soldAt: d.sold_at! })),
    );

    const { settlement } = await settle(patron, dealerMembership, 300000);

    const { data: allocations } = await patron.client
      .from("settlement_allocations")
      .select("sale_id, amount")
      .eq("settlement_id", settlement.id);
    const byId = (a: { sale_id: string }, b: { sale_id: string }) =>
      a.sale_id.localeCompare(b.sale_id);
    expect([...allocations!].sort(byId)).toEqual(
      expected!.map((a) => ({ sale_id: a.saleId, amount: a.amount })).sort(byId),
    );
    expect(allocations).toHaveLength(2);

    const after = await duesOf(patron, dealerMembership);
    expect(after.map((d) => [d.sale_id, d.due])).toEqual([
      [saleIds[0], 0],
      [saleIds[1], 212500],
      [saleIds[2], 230000],
    ]);
  });

  it("commence par les ventes désignées", async () => {
    const { patron, dealerMembership, saleIds } = await shopWithSales([250000, 300000, 240000]);
    const before = await duesOf(patron, dealerMembership);
    const expected = allocateSettlement(
      250000,
      before.map((d) => ({ saleId: d.sale_id!, due: d.due!, soldAt: d.sold_at! })),
      [saleIds[2]],
    );

    await settle(patron, dealerMembership, 250000, { sale_ids: [saleIds[2]] });

    const after = await duesOf(patron, dealerMembership);
    expect(after.map((d) => [d.sale_id, d.due])).toEqual([
      [saleIds[0], 217500],
      [saleIds[1], 275000],
      [saleIds[2], 0],
    ]);
    expect(expected).toEqual([
      { saleId: saleIds[2], amount: 230000 },
      { saleId: saleIds[0], amount: 20000 },
    ]);
  });

  it("un seul règlement peut solder plusieurs ventes ; leurs dépôts passent à « réglé »", async () => {
    const { patron, dealerMembership } = await shopWithSales([250000, 300000, 240000]);

    await settle(patron, dealerMembership, 512500);

    const { data } = await patron.client
      .from("consignments")
      .select("status, sales(sale_price)")
      .order("created_at");
    expect(data?.map((c) => c.status)).toEqual(["SETTLED", "SETTLED", "SOLD"]);
    const after = await duesOf(patron, dealerMembership);
    expect(after.map((d) => d.due)).toEqual([0, 0, 230000]);
  });

  it("refuse un montant supérieur au solde, nul ou négatif", async () => {
    const { patron, shopId, dealerMembership } = await shopWithSales([250000]);

    expect((await settle(patron, dealerMembership, 237501)).error?.message).toBe(
      "amount_exceeds_balance",
    );
    expect((await settle(patron, dealerMembership, 0)).error?.message).toBe("invalid_amount");
    expect((await settle(patron, dealerMembership, -100)).error?.message).toBe("invalid_amount");
    expect((await balanceOf(patron, shopId, dealerMembership))?.balance).toBe(237500);
    expect((await patron.client.from("settlements").select("id")).data).toEqual([]);
  });

  it("renvoyer deux fois le même règlement ne le compte qu'une fois", async () => {
    const { patron, shopId, dealerMembership } = await shopWithSales([250000]);
    const first = await settle(patron, dealerMembership, 100000);

    const replay = await patron.client.rpc("record_settlement", {
      p_settlement: first.settlement,
    });
    expect(replay.error).toBeNull();
    expect((await balanceOf(patron, shopId, dealerMembership))?.balance).toBe(137500);
    expect((await patron.client.from("settlements").select("id")).data).toHaveLength(1);
  });
});

describe("qui enregistre et qui voit les règlements", () => {
  it("le patron et le caissier enregistrent ; le dealer ne peut pas déclarer son propre règlement", async () => {
    const { patron, dealer, cashier, shopId, dealerMembership } = await shopWithSales([250000]);

    expect((await settle(dealer, dealerMembership, 1000)).error?.message).toBe("not_allowed");
    expect((await settle(cashier, dealerMembership, 100000)).error).toBeNull();
    expect((await settle(patron, dealerMembership, 37500)).error).toBeNull();

    expect((await balanceOf(patron, shopId, dealerMembership))?.balance).toBe(100000);
    const { data } = await patron.client
      .from("settlements")
      .select("amount, recorded_by")
      .order("amount");
    expect(data).toEqual([
      { amount: 37500, recorded_by: patron.id },
      { amount: 100000, recorded_by: cashier.id },
    ]);
  });

  it("le dealer voit son solde et ses règlements, pas ceux d'un autre dealer", async () => {
    const { patron, dealer, shopId, dealerMembership } = await shopWithSales([250000]);
    const otherPhone = randomPhone();
    const other = await signUpUser("Autre dealer", { phone: otherPhone });
    await patron.client.rpc("add_member", {
      p_shop_id: shopId,
      p_role: "DEALER",
      p_commission_rate_bps: 4000,
      p_phone: otherPhone,
    });
    const otherMembership = await membershipId(patron, other.id);
    const otherDevice = await createDevice(patron, { shop_id: shopId });
    await consign(patron, otherDevice, otherMembership, { floor_price: 0 });
    await sell(other, otherDevice, { sale_price: 300000 });
    await settle(patron, dealerMembership, 50000);
    await settle(patron, otherMembership, 10000);

    const { data: mine } = await dealer.client.rpc("dealer_balances", { p_shop_id: shopId });
    expect(mine).toHaveLength(1);
    expect(mine![0]).toMatchObject({ membership_id: dealerMembership, balance: 187500 });

    expect((await dealer.client.from("settlements").select("amount")).data).toEqual([
      { amount: 50000 },
    ]);
    expect((await dealer.client.from("settlement_allocations").select("amount")).data).toEqual([
      { amount: 50000 },
    ]);
    expect(await duesOf(dealer, otherMembership)).toEqual([]);

    // Le patron voit les deux, chacun avec son propre solde.
    const { data: all } = await patron.client.rpc("dealer_balances", { p_shop_id: shopId });
    expect(all?.map((row: { balance: number }) => row.balance).sort()).toEqual([187500, 250000]);
  });

  it("une autre boutique et un inconnu ne voient ni soldes ni règlements", async () => {
    const a = await shopWithSales([250000]);
    await settle(a.patron, a.dealerMembership, 50000);
    const b = await shopWithTeam();
    const stranger = await signUpUser("Inconnu", { email: randomEmail() });

    for (const user of [b.patron, b.cashier, b.dealer, stranger]) {
      expect(
        (await user.client.rpc("dealer_balances", { p_shop_id: a.shopId })).data,
      ).toEqual([]);
      expect((await user.client.from("settlements").select("id")).data).toEqual([]);
      expect((await user.client.from("settlement_allocations").select("amount")).data).toEqual([]);
      expect((await user.client.from("sale_dues").select("sale_id")).data).toEqual([]);
      expect((await settle(user, a.dealerMembership, 1000)).error?.message).toBe("not_allowed");
    }
  });

  it("personne n'écrit directement un règlement ou sa répartition", async () => {
    const { patron, dealer, shopId, dealerMembership, saleIds } = await shopWithSales([250000]);
    const { settlement } = await settle(patron, dealerMembership, 50000);

    for (const user of [patron, dealer]) {
      const changes = [
        user.client.from("settlements").update({ amount: 237500 }).eq("id", settlement.id),
        user.client.from("settlements").delete().eq("id", settlement.id),
        user.client.from("settlement_allocations").delete().eq("settlement_id", settlement.id),
        user.client.from("settlement_allocations").insert({
          settlement_id: settlement.id,
          sale_id: saleIds[0],
          amount: 187500,
        }),
        user.client.from("settlements").insert({
          id: randomUUID(),
          shop_id: shopId,
          membership_id: dealerMembership,
          dealer_user_id: dealer.id,
          amount: 187500,
          method: "CASH",
          recorded_by: user.id,
        }),
      ];
      for (const change of changes) {
        expect((await change).error).not.toBeNull();
      }
    }
    expect((await balanceOf(patron, shopId, dealerMembership))?.balance).toBe(187500);
  });
});

describe("échéances d'une vente", () => {
  const schedule = (amounts: number[], paidFirst = false) =>
    amounts.map((amount, index) => ({
      id: randomUUID(),
      amount,
      due_on: `2099-0${index + 1}-15`,
      paid: paidFirst && index === 0,
    }));

  it("le vendeur définit un échéancier dont la somme est le prix de vente", async () => {
    const { dealer, saleIds } = await shopWithSales([250000]);

    const { error } = await dealer.client.rpc("set_installments", {
      p_sale_id: saleIds[0],
      p_installments: schedule([100000, 75000, 75000], true),
    });
    expect(error).toBeNull();

    const { data } = await dealer.client
      .from("installments")
      .select("amount, due_on, paid_on")
      .order("due_on");
    expect(data?.map((i) => [i.amount, i.paid_on !== null])).toEqual([
      [100000, true],
      [75000, false],
      [75000, false],
    ]);
  });

  it("refuse un échéancier dont la somme n'est pas le prix, vide, ou avec un montant nul", async () => {
    const { dealer, saleIds } = await shopWithSales([250000]);
    const attempt = (installments: unknown) =>
      dealer.client.rpc("set_installments", {
        p_sale_id: saleIds[0],
        p_installments: installments,
      });

    for (const invalid of [
      schedule([100000, 100000]),
      schedule([250000, 1]),
      schedule([250000, 0]),
      [],
    ]) {
      expect((await attempt(invalid)).error?.message).toBe("invalid_schedule");
    }
    expect((await dealer.client.from("installments").select("id")).data).toEqual([]);
  });

  it("l'échéancier ne se définit qu'une fois", async () => {
    const { dealer, saleIds } = await shopWithSales([250000]);
    const first = schedule([125000, 125000]);
    const set = (installments: unknown) =>
      dealer.client.rpc("set_installments", {
        p_sale_id: saleIds[0],
        p_installments: installments,
      });

    expect((await set(first)).error).toBeNull();
    expect((await set(first)).error).toBeNull();
    expect((await set(schedule([250000]))).error?.message).toBe("installments_exist");
    expect((await dealer.client.from("installments").select("id")).data).toHaveLength(2);
  });

  it("une échéance se marque payée, puis non payée en cas d'erreur", async () => {
    const { patron, dealer, saleIds } = await shopWithSales([250000]);
    const installments = schedule([125000, 125000]);
    await dealer.client.rpc("set_installments", {
      p_sale_id: saleIds[0],
      p_installments: installments,
    });
    const paidOn = async () =>
      (
        await dealer.client
          .from("installments")
          .select("paid_on")
          .eq("id", installments[0].id)
          .single()
      ).data?.paid_on;

    // Le patron voit la vente : il peut aussi pointer l'échéance.
    await patron.client.rpc("set_installment_paid", {
      p_installment_id: installments[0].id,
      p_paid: true,
    });
    expect(await paidOn()).not.toBeNull();

    await dealer.client.rpc("set_installment_paid", {
      p_installment_id: installments[0].id,
      p_paid: false,
    });
    expect(await paidOn()).toBeNull();
  });

  it("les échéances d'une vente perso sont invisibles pour la boutique", async () => {
    const { patron, dealer, cashier } = await shopWithTeam();
    const personal = await createDevice(dealer, { owner_user_id: dealer.id });
    const { sale } = await sell(dealer, personal, { sale_price: 500000 });
    const installments = schedule([250000, 250000]);
    await dealer.client.rpc("set_installments", {
      p_sale_id: sale.id,
      p_installments: installments,
    });

    expect((await dealer.client.from("installments").select("id")).data).toHaveLength(2);
    for (const user of [patron, cashier]) {
      expect((await user.client.from("installments").select("id")).data).toEqual([]);
      const pay = await user.client.rpc("set_installment_paid", {
        p_installment_id: installments[0].id,
        p_paid: true,
      });
      expect(pay.error?.message).toBe("not_allowed");
      const reset = await user.client.rpc("set_installments", {
        p_sale_id: sale.id,
        p_installments: schedule([500000]),
      });
      expect(reset.error?.message).toBe("not_allowed");
    }
  });

  it("un autre dealer ne touche pas aux échéances d'une vente qui n'est pas la sienne", async () => {
    const { patron, dealer, shopId, saleIds } = await shopWithSales([250000]);
    const otherPhone = randomPhone();
    const other = await signUpUser("Autre dealer", { phone: otherPhone });
    await patron.client.rpc("add_member", {
      p_shop_id: shopId,
      p_role: "DEALER",
      p_commission_rate_bps: 1000,
      p_phone: otherPhone,
    });
    const installments = schedule([125000, 125000]);
    await dealer.client.rpc("set_installments", {
      p_sale_id: saleIds[0],
      p_installments: installments,
    });

    expect((await other.client.from("installments").select("id")).data).toEqual([]);
    const pay = await other.client.rpc("set_installment_paid", {
      p_installment_id: installments[0].id,
      p_paid: true,
    });
    expect(pay.error?.message).toBe("not_allowed");
    for (const change of [
      dealer.client.from("installments").update({ amount: 1 }).eq("id", installments[0].id),
      dealer.client.from("installments").delete().eq("id", installments[0].id),
    ]) {
      expect((await change).error).not.toBeNull();
    }
  });

  it("pas d'échéancier sur une vente en attente de validation", async () => {
    const { patron, dealer, shopId } = await shopWithTeam();
    const deviceId = await createDevice(patron, { shop_id: shopId });
    await consign(patron, deviceId, await membershipId(patron, dealer.id), {
      floor_price: 300000,
    });
    const { sale } = await sell(dealer, deviceId, { sale_price: 250000 });

    const { error } = await dealer.client.rpc("set_installments", {
      p_sale_id: sale.id,
      p_installments: schedule([250000]),
    });
    expect(error?.message).toBe("sale_not_completed");
  });
});
