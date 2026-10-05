import { parsePage } from "@/domain/pagination";
import { CustomersList } from "@/features/sales/lists";
import { requireShop } from "@/lib/session";

export default async function ShopCustomersPage({
  params,
  searchParams,
}: PageProps<"/s/[shopId]/customers">) {
  const { shopId } = await params;
  const { page } = await searchParams;
  const { supabase, profile, shop, membership } = await requireShop(shopId);
  return (
    <CustomersList
      supabase={supabase}
      shopId={shop.id}
      role={membership.role}
      userId={profile.id}
      page={parsePage(page)}
    />
  );
}
