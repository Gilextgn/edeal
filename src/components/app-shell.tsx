import type { ReactNode } from "react";
import { icons, type IconName } from "./icons";
import { NavLink } from "./nav-link";
import { SyncBanner } from "./sync-banner";
import { BrandMark } from "./ui";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
};

type Props = {
  // Nom affiché : celui de la boutique dans un espace boutique, « eDeal » sinon.
  brand: string;
  subtitle: string;
  nav: NavItem[];
  userName: string;
  userId: string;
  children: ReactNode;
};

// Téléphone : barre en haut + onglets en bas. Ordinateur : menu latéral fixe.
export function AppShell({ brand, subtitle, nav, userName, userId, children }: Props) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="hidden border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col">
        <div className="flex items-center gap-3 px-5 py-6">
          <BrandMark name={brand} />
          <div className="min-w-0">
            <p className="truncate font-bold">{brand}</p>
            <p className="truncate text-xs text-muted">{subtitle}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => (
            <NavLink key={item.href} href={item.href} exact={item.exact} layout="sidebar">
              {icons[item.icon]}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <p className="truncate border-t border-border px-5 py-4 text-sm text-muted">
          {userName}
        </p>
      </aside>

      <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
        <BrandMark name={brand} />
        <div className="min-w-0">
          <p className="truncate font-bold leading-tight">{brand}</p>
          <p className="truncate text-xs text-muted">{subtitle}</p>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 pt-5 lg:px-10 lg:py-9">
        <div className="mx-auto w-full max-w-5xl">
          <SyncBanner userId={userId} />
          {children}
        </div>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 grid border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
      >
        {nav.map((item) => (
          <NavLink key={item.href} href={item.href} exact={item.exact} layout="tab">
            {icons[item.icon]}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
