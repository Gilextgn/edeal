import { ShopDashboard } from "@/features/dashboard/dashboards";
import { requireShop } from "@/lib/session";

export default async function ShopHomePage({ params }: PageProps<"/s/[shopId]">) {
  const { shopId } = await params;
  const { supabase, profile, shop, membership } = await requireShop(shopId);
  return (
    <ShopDashboard
      supabase={supabase}
      shop={shop}
      role={membership.role}
      userName={profile.name}
      commissionRateBps={membership.commission_rate_bps}
    />
  );
}
