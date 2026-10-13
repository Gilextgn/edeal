import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "../auth-form";

// Nouveau mot de passe : on arrive ici connecté, par le lien reçu par e-mail.
export default async function ResetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=link");

  const t = await getTranslations("auth");
  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t.rich("resetTitle", {
            accent: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </h1>
        <p className="mt-2 text-sm font-semibold">
          {/* Compte créé par le superadmin : le mot de passe reçu est provisoire. */}
          {t(user.user_metadata?.must_change_password ? "resetForced" : "resetSubtitle")}
        </p>
      </div>
      <div className="mt-10">
        <ResetForm identifier={user.email ?? ""} />
      </div>
    </>
  );
}
