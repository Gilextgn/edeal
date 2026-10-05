import { parsePage } from "@/domain/pagination";
import { CustomersList } from "@/features/sales/lists";
import { requireUser } from "@/lib/session";

export default async function PersonalCustomersPage({
  searchParams,
}: PageProps<"/perso/customers">) {
  const { page } = await searchParams;
  const { supabase, profile } = await requireUser();
  return (
    <CustomersList
      supabase={supabase}
      shopId={null}
      role={null}
      userId={profile.id}
      page={parsePage(page)}
    />
  );
}
