import { BalancesList } from "@/features/money/pages";
import { requireShop } from "@/lib/session";

export default async function BalancesPage({
  params,
  searchParams,
}: PageProps<"/s/[shopId]/balances">) {
  const { shopId } = await params;
  const { settled } = await searchParams;
  const { supabase, shop, membership } = await requireShop(shopId);
  return (
    <BalancesList
      supabase={supabase}
      shop={shop}
      role={membership.role}
      settled={settled === "1"}
    />
  );
}
