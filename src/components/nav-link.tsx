"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  href: string;
  // Vrai pour une page d'accueil : active seulement sur l'adresse exacte.
  exact?: boolean;
  layout: "sidebar" | "tab";
  children: ReactNode;
};

const layouts = {
  sidebar: {
    base: "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium",
    active: "bg-primary-soft text-on-primary-soft",
    idle: "text-muted hover:bg-surface-2 hover:text-fg",
  },
  tab: {
    base: "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
    active: "text-primary",
    idle: "text-muted",
  },
};

export function NavLink({ href, exact, layout, children }: Props) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
  const style = layouts[layout];

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${style.base} ${active ? style.active : style.idle} focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary`}
    >
      {children}
    </Link>
  );
}
