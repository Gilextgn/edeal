import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { icons } from "./icons";

// Zones tactiles de 48 px : au-dessus du minimum de 44 px exigé.

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const buttonBase = `inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition disabled:opacity-60 active:scale-[0.98] ${focusRing}`;

const buttonVariants = {
  primary: "bg-primary text-on-primary shadow-card hover:bg-primary-hover",
  accent: "bg-accent text-on-accent shadow-card hover:brightness-95",
  secondary: "border border-border bg-surface text-fg hover:bg-surface-2",
  danger: "border border-border bg-surface text-danger hover:bg-danger-soft",
};

type Variant = keyof typeof buttonVariants;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      className={`${buttonBase} ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link
      className={`${buttonBase} ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

const control = `min-h-12 rounded-2xl border border-border bg-surface px-4 text-base text-fg transition-colors placeholder:text-muted hover:border-muted focus:border-primary ${focusRing}`;

type FieldProps = ComponentProps<"input"> & {
  label: string;
  hint?: string;
  name: string;
};

export function Field({ label, hint, name, className = "", ...props }: FieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={name} className="text-sm font-semibold text-fg">
        {label}
      </label>
      <input id={name} name={name} aria-describedby={hintId} className={control} {...props} />
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Textarea({
  label,
  hint,
  name,
  ...props
}: ComponentProps<"textarea"> & { label: string; hint?: string; name: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold text-fg">
        {label}
      </label>
      <textarea id={name} name={name} rows={3} className={`${control} py-3`} {...props} />
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-3xl bg-surface p-4 shadow-card sm:p-5 ${className}`}
      {...props}
    />
  );
}

const badgeTones = {
  neutral: "bg-surface-2 text-muted",
  primary: "bg-primary-soft text-on-primary-soft",
  accent: "bg-accent-soft text-warning",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof badgeTones;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

// En-tête de page : grand titre, sous-titre, action à droite.
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex animate-rise flex-col gap-3 sm:flex-row sm:items-end sm:justify-between lg:mb-7">
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-fg lg:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">{children}</h2>
  );
}

export function FormMessage({
  tone,
  children,
}: {
  tone: "danger" | "success" | "warning";
  children: ReactNode;
}) {
  const tones = {
    danger: "bg-danger-soft text-danger",
    warning: "bg-warning-soft text-warning",
    success: "bg-success-soft text-success",
  };
  return (
    <p
      role={tone === "danger" ? "alert" : "status"}
      className={`rounded-2xl px-4 py-3 text-sm font-medium ${tones[tone]}`}
    >
      {children}
    </p>
  );
}

// Carré de marque : initiale de la boutique, ou « e » pour eDeal.
export function BrandMark({
  name,
  size = "md",
  inverted = false,
}: {
  name: string;
  size?: "md" | "lg";
  inverted?: boolean;
}) {
  const sizes = { md: "size-10 text-lg", lg: "size-12 text-xl" };
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl font-extrabold uppercase ${inverted ? "bg-on-brand text-brand" : "bg-primary text-on-primary"} ${sizes[size]}`}
    >
      {name.trim().charAt(0) || "e"}
    </span>
  );
}

// ---------- Actions d'une ligne de liste : voir, modifier, supprimer ----------

const actionTones = {
  view: "text-fg bg-surface-2 hover:bg-primary hover:text-on-primary",
  edit: "text-fg bg-surface-2 hover:bg-primary hover:text-on-primary",
  delete: "text-danger bg-danger-soft hover:bg-danger hover:text-surface",
};

const actionIcons = { view: icons.eye, edit: icons.pencil, delete: icons.trash };

const actionBase = `inline-flex size-11 items-center justify-center rounded-full transition-colors ${focusRing}`;

type ActionKind = keyof typeof actionTones;

export function ActionLink({
  kind,
  label,
  ...props
}: Omit<ComponentProps<typeof Link>, "children"> & { kind: ActionKind; label: string }) {
  return (
    <Link
      aria-label={label}
      title={label}
      className={`${actionBase} ${actionTones[kind]}`}
      {...props}
    >
      {actionIcons[kind]}
    </Link>
  );
}

export function ActionButton({
  kind,
  label,
  ...props
}: Omit<ComponentProps<"button">, "children"> & { kind: ActionKind; label: string }) {
  return (
    <button
      type="submit"
      aria-label={label}
      title={label}
      className={`${actionBase} ${actionTones[kind]}`}
      {...props}
    >
      {actionIcons[kind]}
    </button>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-1.5">{children}</div>;
}

// ---------- Tableaux ----------
// Sur téléphone, les colonnes secondaires sont masquées (classe `hidden md:table-cell`
// posée par l'appelant) : il reste l'essentiel et les actions.

export function TableCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ className = "", ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={`border-b border-border px-3 py-4 text-xs font-semibold uppercase tracking-wider text-muted sm:px-5 ${className}`}
      {...props}
    />
  );
}

export function Td({ className = "", ...props }: ComponentProps<"td">) {
  return (
    <td
      className={`border-b border-border px-3 py-3.5 align-middle sm:px-5 [tr:last-child>&]:border-b-0 ${className}`}
      {...props}
    />
  );
}

// ---------- Pagination ----------

export function Pagination({
  page,
  pageCount,
  total,
  hrefFor,
  labels,
}: {
  page: number;
  pageCount: number;
  total: number;
  // Présents dans l'objet renvoyé par pageInfo ; le résumé est déjà mis en forme.
  from?: number;
  to?: number;
  hrefFor: (page: number) => string;
  labels: { summary: string; previous: string; next: string };
}) {
  if (total === 0) return null;
  const link = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-surface px-3 text-sm font-semibold shadow-card hover:bg-surface-2 ${focusRing}`;
  const disabled =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-muted opacity-40";

  // Pages affichées : la première, la dernière, et celles autour de la page courante.
  const shown = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);

  return (
    <nav
      aria-label={labels.summary}
      className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-sm text-muted">
        {labels.summary}
      </p>
      {pageCount > 1 ? (
        <ul className="flex items-center gap-1.5">
          <li>
            {page > 1 ? (
              <Link href={hrefFor(page - 1)} aria-label={labels.previous} className={link}>
                {icons.chevronLeft}
              </Link>
            ) : (
              <span className={disabled}>{icons.chevronLeft}</span>
            )}
          </li>
          {shown.map((p, index) => (
            <li key={p} className="flex items-center gap-1.5">
              {index > 0 && p - shown[index - 1] > 1 ? (
                <span className="px-1 text-muted">…</span>
              ) : null}
              {p === page ? (
                <span
                  aria-current="page"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-primary px-3 text-sm font-bold text-on-primary"
                >
                  {p}
                </span>
              ) : (
                <Link href={hrefFor(p)} className={link}>
                  {p}
                </Link>
              )}
            </li>
          ))}
          <li>
            {page < pageCount ? (
              <Link href={hrefFor(page + 1)} aria-label={labels.next} className={link}>
                {icons.chevron}
              </Link>
            ) : (
              <span className={disabled}>{icons.chevron}</span>
            )}
          </li>
        </ul>
      ) : null}
    </nav>
  );
}
