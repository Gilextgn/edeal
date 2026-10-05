import { SaleDetail } from "@/features/money/pages";
import { requireShop } from "@/lib/session";

export default async function ShopSalePage({
  params,
}: PageProps<"/s/[shopId]/sales/[saleId]">) {
  const { shopId, saleId } = await params;
  const { supabase, profile, shop } = await requireShop(shopId);
  return (
    <SaleDetail
      supabase={supabase}
      shopId={shop.id}
      userId={profile.id}
      saleId={saleId}
      currency={shop.currency}
    />
  );
}
