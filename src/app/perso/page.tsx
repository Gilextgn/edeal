import { parsePeriod } from "@/domain/stats";
import { PersonalDashboard } from "@/features/dashboard/dashboards";
import { requireUser } from "@/lib/session";

export default async function PersonalHomePage({ searchParams }: PageProps<"/perso">) {
  const [{ supabase, profile }, { period }] = await Promise.all([requireUser(), searchParams]);
  return (
    <PersonalDashboard
      supabase={supabase}
      userId={profile.id}
      userName={profile.name}
      period={parsePeriod(period)}
    />
  );
}
