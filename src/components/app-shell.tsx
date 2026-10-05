import type { ReactNode } from "react";
import { icons, type IconName } from "./icons";
import { MoreMenu } from "./more-menu";
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
  // Libellé de l'onglet « Plus » de la barre du bas.
  moreLabel: string;
  children: ReactNode;
};

// La barre du bas d'un téléphone contient cinq onglets au plus.
const MAX_TABS = 5;

// Téléphone : barre en haut + onglets en bas. Ordinateur : menu latéral fixe.
export function AppShell({
  brand,
  subtitle,
  nav,
  userName,
  userId,
  moreLabel,
  children,
}: Props) {
  const overflow = nav.length > MAX_TABS;
  const tabs = overflow ? nav.slice(0, MAX_TABS - 1) : nav;
  const extra = overflow ? nav.slice(MAX_TABS - 1) : [];

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
        style={{ gridTemplateColumns: `repeat(${tabs.length + (overflow ? 1 : 0)}, minmax(0, 1fr))` }}
      >
        {tabs.map((item) => (
          <NavLink key={item.href} href={item.href} exact={item.exact} layout="tab">
            {icons[item.icon]}
            {item.label}
          </NavLink>
        ))}
        {overflow ? (
          <MoreMenu label={moreLabel} icon={icons.more}>
            {extra.map((item) => (
              <NavLink key={item.href} href={item.href} exact={item.exact} layout="sidebar">
                {icons[item.icon]}
                {item.label}
              </NavLink>
            ))}
          </MoreMenu>
        ) : null}
      </nav>
    </div>
  );
}
