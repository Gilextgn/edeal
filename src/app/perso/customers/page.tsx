import { CustomersList } from "@/features/sales/pages";
import { requireUser } from "@/lib/session";

export default async function PersonalCustomersPage() {
  const { supabase, profile } = await requireUser();
  return <CustomersList supabase={supabase} shopId={null} role={null} userId={profile.id} />;
}
