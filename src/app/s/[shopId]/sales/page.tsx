import { SalesList } from "@/features/sales/pages";
import { requireShop } from "@/lib/session";

export default async function ShopSalesPage({ params }: PageProps<"/s/[shopId]/sales">) {
  const { shopId } = await params;
  const { supabase, profile, shop, membership } = await requireShop(shopId);
  return (
    <SalesList
      supabase={supabase}
      shopId={shop.id}
      role={membership.role}
      userId={profile.id}
      currency={shop.currency}
    />
  );
}
