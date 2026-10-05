import { parsePage } from "@/domain/pagination";
import { SalesList } from "@/features/sales/lists";
import { requireShop } from "@/lib/session";

export default async function ShopSalesPage({
  params,
  searchParams,
}: PageProps<"/s/[shopId]/sales">) {
  const { shopId } = await params;
  const { page } = await searchParams;
  const { supabase, profile, shop, membership } = await requireShop(shopId);
  return (
    <SalesList
      supabase={supabase}
      shopId={shop.id}
      role={membership.role}
      userId={profile.id}
      page={parsePage(page)}
      currency={shop.currency}
    />
  );
}
