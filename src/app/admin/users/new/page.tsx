import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { requireSuperadmin } from "@/lib/superadmin";
import { CreateAccountForm } from "./create-account-form";

// Le superadmin crée un compte et en transmet les accès à la personne.
export default async function AdminNewUserPage() {
  const { admin } = await requireSuperadmin();
  const t = await getTranslations("admin");
  const { data: shops } = await admin
    .from("shops")
    .select("id, name")
    .is("suspended_at", null)
    .order("name");

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title={t("createAccount")} subtitle={t("createSubtitle")} />
      <CreateAccountForm shops={shops ?? []} />
    </div>
  );
}
