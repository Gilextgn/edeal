import { parsePeriod } from "@/domain/stats";
import { ShopDashboard } from "@/features/dashboard/dashboards";
import { requireShop } from "@/lib/session";

export default async function ShopHomePage({
  params,
  searchParams,
}: PageProps<"/s/[shopId]">) {
  const [{ shopId }, { period }] = await Promise.all([params, searchParams]);
  const { supabase, profile, shop, membership } = await requireShop(shopId);
  return (
    <ShopDashboard
      supabase={supabase}
      shop={shop}
      role={membership.role}
      userName={profile.name}
      commissionRateBps={membership.commission_rate_bps}
      period={parsePeriod(period)}
    />
  );
}
