import { PersonalDashboard } from "@/features/dashboard/dashboards";
import { requireUser } from "@/lib/session";

export default async function PersonalHomePage() {
  const { supabase, profile } = await requireUser();
  return <PersonalDashboard supabase={supabase} userId={profile.id} userName={profile.name} />;
}
