import { CustomersList } from "@/features/sales/pages";
import { requireShop } from "@/lib/session";

export default async function ShopCustomersPage({ params }: PageProps<"/s/[shopId]/customers">) {
  const { shopId } = await params;
  const { supabase, profile, shop, membership } = await requireShop(shopId);
  return (
    <CustomersList supabase={supabase} shopId={shop.id} role={membership.role} userId={profile.id} />
  );
}
