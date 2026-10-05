import { ShopDashboard } from "@/features/dashboard/dashboards";
import { requireShop } from "@/lib/session";

export default async function ShopHomePage({ params }: PageProps<"/s/[shopId]">) {
  const { shopId } = await params;
  const { supabase, shop, membership } = await requireShop(shopId);
  return (
    <ShopDashboard
      supabase={supabase}
      shop={shop}
      role={membership.role}
      commissionRateBps={membership.commission_rate_bps}
    />
  );
}
