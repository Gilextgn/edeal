import type { ComponentProps } from "react";

// Zones tactiles de 48 px : au-dessus du minimum de 44 px exigé.

export function Button({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-5 text-base font-semibold text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

export function SecondaryButton({
  className = "",
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-surface px-5 text-base font-semibold text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

type FieldProps = ComponentProps<"input"> & {
  label: string;
  hint?: string;
  name: string;
};

export function Field({ label, hint, name, ...props }: FieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-describedby={hintId}
        className="min-h-12 rounded-xl border border-border bg-surface px-4 text-base text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-link"
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
