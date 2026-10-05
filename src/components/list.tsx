import { getTranslations } from "next-intl/server";
import { pageInfo } from "@/domain/pagination";
import { icons } from "./icons";
import { Pagination, focusRing } from "./ui";

// Bas de liste : « 11–20 sur 43 » et les numéros de page. Les autres
// paramètres de l'adresse (recherche) sont conservés d'une page à l'autre.
export async function ListPagination({
  page,
  total,
  path,
  query = {},
}: {
  page: number;
  total: number;
  path: string;
  query?: Record<string, string>;
}) {
  const t = await getTranslations("list");
  const info = pageInfo(page, total);
  const hrefFor = (target: number) => {
    const params = new URLSearchParams(query);
    for (const [key, value] of [...params]) if (!value) params.delete(key);
    if (target > 1) params.set("page", String(target));
    const search = params.toString();
    return search ? `${path}?${search}` : path;
  };

  return (
    <Pagination
      {...info}
      hrefFor={hrefFor}
      labels={{
        summary: t("summary", { from: info.from, to: info.to, total: info.total }),
        previous: t("previous"),
        next: t("next"),
      }}
    />
  );
}

// Champ de recherche d'une liste (envoie « ?q= » à la même page).
export async function ListSearch({
  path,
  value,
  placeholder,
}: {
  path: string;
  value: string;
  placeholder: string;
}) {
  const t = await getTranslations("list");
  return (
    <form action={path} role="search" className="mb-4 flex gap-2">
      <div className="relative flex-1 sm:max-w-sm">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          {icons.search}
        </span>
        <input
          type="search"
          name="q"
          defaultValue={value}
          placeholder={placeholder}
          aria-label={placeholder}
          className={`h-12 w-full rounded-xl border border-border bg-surface pl-10 pr-3 text-base placeholder:text-muted ${focusRing}`}
        />
      </div>
      <button
        type="submit"
        className={`min-h-12 rounded-xl border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-2 ${focusRing}`}
      >
        {t("search")}
      </button>
    </form>
  );
}
