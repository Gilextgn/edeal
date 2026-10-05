import { describe, expect, it } from "vitest";
import { computeShares } from "../../src/domain/shares";
import { CONSIGNMENT_CASES } from "../../src/domain/shares.cases";
import { randomEmail, signUpUser } from "./helpers";

// La base calcule les parts au moment d'enregistrer la vente ; l'application
// les calcule pour l'aperçu. Ce test garantit que les deux sont d'accord.
describe("calcul des parts : base et application donnent le même résultat", () => {
  it("sur tous les cas de référence", async () => {
    const user = await signUpUser("Awa", { email: randomEmail() });

    for (const [salePrice, purchasePrice, rate, expected] of CONSIGNMENT_CASES) {
      const { data, error } = await user.client
        .rpc("preview_shares", {
          p_sale_price: salePrice,
          p_purchase_price: purchasePrice,
          p_rate_bps: rate,
        })
        .single();
      expect(error).toBeNull();

      const label = `vente ${salePrice}, achat ${purchasePrice}, taux ${rate}`;
      expect(data, label).toEqual({
        dealer_share: expected,
        shop_share: salePrice - expected,
      });
      expect(
        computeShares("CONSIGNMENT", { salePrice, purchasePrice, commissionRateBps: rate }),
        label,
      ).toEqual({ dealerShare: expected, shopShare: salePrice - expected });
    }
  });
});
