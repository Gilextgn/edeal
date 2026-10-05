"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

// Dernier onglet de la barre du bas sur téléphone : ouvre les liens qui ne
// tiennent pas dans la barre. Se referme dès qu'on change de page.
export function MoreMenu({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpenedOn(open ? null : pathname)}
        className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${open ? "text-primary" : "text-muted"}`}
      >
        {icon}
        {label}
      </button>
      {open ? (
        <div className="absolute inset-x-0 bottom-full flex flex-col gap-1 border-t border-border bg-surface p-3 shadow-lg">
          {children}
        </div>
      ) : null}
    </>
  );
}
