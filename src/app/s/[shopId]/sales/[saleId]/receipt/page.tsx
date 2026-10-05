import { ReceiptPage } from "@/features/share/pages";
import { requireShop } from "@/lib/session";

export default async function ShopReceiptPage({
  params,
}: PageProps<"/s/[shopId]/sales/[saleId]/receipt">) {
  const { shopId, saleId } = await params;
  const { supabase, profile, shop } = await requireShop(shopId);
  return (
    <ReceiptPage
      supabase={supabase}
      shopId={shop.id}
      userId={profile.id}
      saleId={saleId}
      seller={{ name: shop.name, phone: shop.phone, address: shop.address }}
      backHref={`/s/${shop.id}/sales/${saleId}`}
      currency={shop.currency}
    />
  );
}
