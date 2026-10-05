import { DealerConsignmentPage } from "@/features/sales/pages";
import { requireShop } from "@/lib/session";

export default async function ConsignmentPage({
  params,
}: PageProps<"/s/[shopId]/consignments/[consignmentId]">) {
  const { shopId, consignmentId } = await params;
  const { supabase, profile, shop, membership } = await requireShop(shopId);
  return (
    <DealerConsignmentPage
      supabase={supabase} shop={shop} role={membership.role} userId={profile.id}
      consignmentId={consignmentId}
    />
  );
}
