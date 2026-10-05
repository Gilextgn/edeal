import { parsePage } from "@/domain/pagination";
import { ConsignmentsList } from "@/features/sales/lists";
import { requireShop } from "@/lib/session";

export default async function ConsignmentsPage({
  params,
  searchParams,
}: PageProps<"/s/[shopId]/consignments">) {
  const { shopId } = await params;
  const { page } = await searchParams;
  const { supabase, shop, membership } = await requireShop(shopId);
  return (
    <ConsignmentsList
      supabase={supabase}
      shop={shop}
      role={membership.role}
      page={parsePage(page)}
    />
  );
}
