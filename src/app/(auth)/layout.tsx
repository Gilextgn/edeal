import { useTranslations } from "next-intl";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("app");
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-primary px-4 pb-8 pt-10 text-on-primary">
        <p className="text-2xl font-bold">{t("name")}</p>
        <p className="mt-1 text-sm">{t("description")}</p>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
