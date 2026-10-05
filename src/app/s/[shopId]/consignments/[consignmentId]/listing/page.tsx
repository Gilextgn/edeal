import { DealerListingPage } from "@/features/sales/pages";
import { requireShop } from "@/lib/session";

export default async function ConsignmentListingPage({
  params,
}: PageProps<"/s/[shopId]/consignments/[consignmentId]/listing">) {
  const { shopId, consignmentId } = await params;
  const { supabase, profile, shop, membership } = await requireShop(shopId);
  return (
    <DealerListingPage
      supabase={supabase}
      shop={shop}
      role={membership.role}
      userId={profile.id}
      consignmentId={consignmentId}
      contactPhone={profile.phone ? `+${profile.phone}` : null}
    />
  );
}
