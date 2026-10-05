import { ReceiptPage } from "@/features/share/pages";
import { requireUser } from "@/lib/session";

export default async function PersonalReceiptPage({
  params,
}: PageProps<"/perso/sales/[saleId]/receipt">) {
  const { saleId } = await params;
  const { supabase, profile } = await requireUser();
  return (
    <ReceiptPage
      supabase={supabase}
      shopId={null}
      userId={profile.id}
      saleId={saleId}
      seller={{
        name: profile.name,
        phone: profile.phone ? `+${profile.phone}` : null,
        address: null,
      }}
      backHref={`/perso/sales/${saleId}`}
    />
  );
}
