import { parsePage } from "@/domain/pagination";
import { SalesList } from "@/features/sales/lists";
import { requireUser } from "@/lib/session";

export default async function PersonalSalesPage({ searchParams }: PageProps<"/perso/sales">) {
  const { page } = await searchParams;
  const { supabase, profile } = await requireUser();
  return (
    <SalesList
      supabase={supabase}
      shopId={null}
      role={null}
      userId={profile.id}
      page={parsePage(page)}
    />
  );
}
