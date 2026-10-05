import { ConsignmentsList } from "@/features/sales/pages";
import { requireShop } from "@/lib/session";

export default async function ConsignmentsPage({ params }: PageProps<"/s/[shopId]/consignments">) {
  const { shopId } = await params;
  const { supabase, profile, shop, membership } = await requireShop(shopId);
  return <ConsignmentsList supabase={supabase} shop={shop} role={membership.role} userId={profile.id} />;
}
