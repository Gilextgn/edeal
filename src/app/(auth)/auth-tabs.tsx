"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { focusRing } from "@/components/ui";

// Bascule « Connexion / Inscription » en haut du formulaire, comme dans une
// application : deux onglets en pastille, celui de l'écran ouvert est plein.
export function AuthTabs({ login, signup }: { login: string; signup: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/login", label: login },
    { href: "/signup", label: signup },
  ];
  return (
    <nav className="mb-6 flex gap-1 rounded-full bg-surface-2 p-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-full text-sm font-bold transition-colors ${active ? "bg-primary text-on-primary shadow-card" : "text-muted hover:text-fg"} ${focusRing}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
