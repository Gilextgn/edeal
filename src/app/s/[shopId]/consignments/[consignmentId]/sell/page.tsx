import { DealerSellPage } from "@/features/sales/pages";
import { requireShop } from "@/lib/session";

export default async function ConsignmentSellPage({
  params,
}: PageProps<"/s/[shopId]/consignments/[consignmentId]/sell">) {
  const { shopId, consignmentId } = await params;
  const { supabase, profile, shop, membership } = await requireShop(shopId);
  return (
    <DealerSellPage
      supabase={supabase} shop={shop} role={membership.role} userId={profile.id}
      consignmentId={consignmentId}
      rateBps={membership.commission_rate_bps}
    />
  );
}
