import { SaleDetail } from "@/features/money/pages";
import { requireUser } from "@/lib/session";

export default async function PersonalSalePage({
  params,
}: PageProps<"/perso/sales/[saleId]">) {
  const { saleId } = await params;
  const { supabase, profile } = await requireUser();
  return <SaleDetail supabase={supabase} shopId={null} userId={profile.id} saleId={saleId} />;
}
