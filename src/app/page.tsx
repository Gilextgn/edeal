import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SecondaryButton } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./(auth)/actions";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  const t = await getTranslations();

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-primary px-4 py-4 text-on-primary">
        <p className="text-lg font-bold">{t("app.name")}</p>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
        <h1 className="text-xl font-bold">
          {t("home.greeting", { name: profile?.name ?? "" })}
        </h1>
        <p className="rounded-xl border border-border bg-surface p-4 text-muted">
          {t("home.empty")}
        </p>
        <form action={signOut} className="mt-auto">
          <SecondaryButton type="submit">{t("auth.logout")}</SecondaryButton>
        </form>
      </main>
    </div>
  );
}
