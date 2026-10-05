import { SalesList } from "@/features/sales/pages";
import { requireUser } from "@/lib/session";

export default async function PersonalSalesPage() {
  const { supabase, profile } = await requireUser();
  return <SalesList supabase={supabase} shopId={null} role={null} userId={profile.id} />;
}
