import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Zones tactiles de 48 px : au-dessus du minimum de 44 px exigé.

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const buttonBase = `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors disabled:opacity-60 ${focusRing}`;

const buttonVariants = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
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

type FieldProps = ComponentProps<"input"> & {
  label: string;
  hint?: string;
  name: string;
};

export function Field({ label, hint, name, className = "", ...props }: FieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={name} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-describedby={hintId}
        className={`min-h-12 rounded-xl border border-border bg-surface px-4 text-base text-fg placeholder:text-muted ${focusRing}`}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Card({
  className = "",
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-4 sm:p-5 ${className}`}
      {...props}
    />
  );
}

const badgeTones = {
  neutral: "bg-surface-2 text-muted",
  primary: "bg-primary-soft text-on-primary-soft",
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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

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
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:mb-7">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function FormMessage({
  tone,
  children,
}: {
  tone: "danger" | "success";
  children: ReactNode;
}) {
  const tones = {
    danger: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
  };
  return (
    <p
      role={tone === "danger" ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm font-medium ${tones[tone]}`}
    >
      {children}
    </p>
  );
}

// Carré de marque : initiale de la boutique, ou « e » pour eDeal.
export function BrandMark({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const sizes = { md: "size-10 text-lg", lg: "size-12 text-xl" };
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand to-brand-2 font-bold text-on-brand ${sizes[size]}`}
    >
      {name.trim().charAt(0) || "e"}
    </span>
  );
}
