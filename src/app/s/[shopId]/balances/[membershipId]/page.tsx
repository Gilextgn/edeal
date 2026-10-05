import { BalanceDetail } from "@/features/money/pages";
import { requireShop } from "@/lib/session";

export default async function BalancePage({
  params,
  searchParams,
}: PageProps<"/s/[shopId]/balances/[membershipId]">) {
  const { shopId, membershipId } = await params;
  const { settled } = await searchParams;
  const { supabase, shop, membership } = await requireShop(shopId);
  return (
    <BalanceDetail
      supabase={supabase}
      shop={shop}
      role={membership.role}
      membershipId={membershipId}
      settled={settled === "1"}
    />
  );
}
