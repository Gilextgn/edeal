"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";
import { usePersistentFlag, useTheme } from "@/lib/browser-store";
import { clearOfflinePages } from "@/lib/offline/pages";
import { icons, type IconName } from "./icons";
import { OfflineBanner } from "./offline";
import { PalettePicker } from "./palette-picker";
import { SyncBanner } from "./sync-banner";
import { BrandMark, focusRing } from "./ui";

export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };
export type ShellAlert = { key: string; href: string; title: string; detail: string };
export type ShellSpace = { href: string; label: string; hint: string; current: boolean };

export type ShellProps = {
  // Nom affiché : celui de la boutique dans un espace boutique, « eDeal » sinon.
  brand: string;
  nav: NavItem[];
  user: { id: string; name: string; role: string };
  spaces: ShellSpace[];
  alerts: ShellAlert[];
  // Bouton d'action de la barre du haut, selon le profil.
  primaryAction: { href: string; label: string } | null;
  // Page de liste qui reçoit la recherche (« ?q= »), s'il y en a une.
  search: { href: string; placeholder: string } | null;
  labels: {
    menu: string;
    more: string;
    theme: string;
    alerts: string;
    noAlerts: string;
    spaces: string;
    account: string;
    palette: string;
    logout: string;
  };
  children: ReactNode;
};

// La barre du bas d'un téléphone contient cinq onglets au plus.
const MAX_TABS = 5;

function isActive(pathname: string, item: NavItem) {
  // Un lien peut porter des paramètres (« /?spaces=1 ») : on compare le chemin.
  const path = item.href.split("?")[0];
  return item.exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
}

// Menu déroulant : se ferme au clic ailleurs, avec Échap, ou en changeant de page.
function Dropdown({
  label,
  trigger,
  align = "right",
  children,
}: {
  label: string;
  trigger: ReactNode;
  align?: "left" | "right";
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) {
        setOpenedOn(null);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpenedOn(open ? null : pathname)}
        className={`flex min-h-11 items-center gap-2 rounded-xl px-2 hover:bg-surface-2 ${focusRing}`}
      >
        {trigger}
      </button>
      {open ? (
        <div
          className={`absolute top-full z-30 mt-2 w-72 max-w-[calc(100vw-1.5rem)] animate-rise rounded-2xl border border-border bg-surface p-2 shadow-card ${align === "right" ? "right-0" : "left-0"}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

const menuItem = `flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium hover:bg-surface-2 ${focusRing}`;

function SidebarContent({
  brand,
  nav,
  collapsed,
  logoutLabel,
}: {
  brand: string;
  nav: NavItem[];
  collapsed: boolean;
  logoutLabel: string;
}) {
  const pathname = usePathname();
  const item = `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${collapsed ? "justify-center" : ""}`;

  return (
    <>
      <div className={`flex h-16 shrink-0 items-center gap-3 ${collapsed ? "justify-center px-2" : "px-5"}`}>
        <BrandMark name={brand} />
        {collapsed ? null : (
          <p className="truncate font-display text-2xl leading-tight text-on-brand">{brand}</p>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
        {nav.map((entry) => {
          const active = isActive(pathname, entry);
          return (
            <Link
              key={entry.href}
              href={entry.href}
              title={collapsed ? entry.label : undefined}
              aria-current={active ? "page" : undefined}
              className={`${item} ${active ? "bg-on-brand/15 text-on-brand shadow-[inset_3px_0_0_var(--accent)]" : "text-on-brand-muted hover:bg-on-brand/10 hover:text-on-brand"}`}
            >
              {icons[entry.icon]}
              {collapsed ? <span className="sr-only">{entry.label}</span> : entry.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-on-brand/15 p-3">
        <button
          type="button"
          title={collapsed ? logoutLabel : undefined}
          onClick={logout}
          className={`${item} w-full text-on-brand-muted hover:bg-on-brand/10 hover:text-on-brand`}
        >
          {icons.logout}
          {collapsed ? <span className="sr-only">{logoutLabel}</span> : logoutLabel}
        </button>
      </div>
    </>
  );
}

// Efface les pages gardées sur le téléphone avant de fermer la session.
async function logout() {
  await clearOfflinePages();
  await signOut();
}

const sidebarSurface = "bg-linear-to-b from-brand to-[color-mix(in_oklab,var(--brand),var(--brand-2)_55%)]";

export function Shell({
  brand,
  nav,
  user,
  spaces,
  alerts,
  primaryAction,
  search,
  labels,
  children,
}: ShellProps) {
  const pathname = usePathname();
  const [collapsed, toggleCollapsed] = usePersistentFlag("edeal:sidebar-collapsed");
  const [drawerOn, setDrawerOn] = useState<string | null>(null);
  const drawerOpen = drawerOn === pathname;
  const [theme, toggleTheme] = useTheme();
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl+K (ou ⌘K) : aller à la recherche.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = nav.filter((entry) => isActive(pathname, entry)).at(-1);
  // Barre du bas : l'action principale prend une place au centre.
  const slots = primaryAction ? MAX_TABS - 1 : MAX_TABS;
  const overflow = nav.length > slots;
  const tabs = overflow ? nav.slice(0, slots - 1) : nav;
  const half = Math.ceil((tabs.length + (overflow ? 1 : 0)) / 2);
  const tabBase =
    "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";
  const tab = (entry: NavItem) => {
    const active = isActive(pathname, entry);
    return (
      <Link
        key={entry.href}
        href={entry.href}
        aria-current={active ? "page" : undefined}
        className={`${tabBase} ${active ? "bg-primary-soft text-on-primary-soft" : "text-muted"}`}
      >
        {icons[entry.icon]}
        <span className="max-w-full truncate px-1">{entry.label}</span>
      </Link>
    );
  };
  const initials = user.name
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const iconButton = `relative size-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg ${focusRing}`;

  return (
    <div className="flex min-h-dvh">
      {/* Menu latéral, ordinateur : repliable en bande d'icônes. */}
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col transition-[width] duration-200 print:!hidden lg:flex ${sidebarSurface} ${collapsed ? "w-[76px]" : "w-64"}`}
      >
        <SidebarContent brand={brand} nav={nav} collapsed={collapsed} logoutLabel={labels.logout} />
      </aside>

      {/* Menu latéral, téléphone : tiroir par-dessus la page. */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <button
            type="button"
            aria-label={labels.menu}
            onClick={() => setDrawerOn(null)}
            className="absolute inset-0 bg-fg/50"
          />
          <aside className={`relative flex h-full w-72 max-w-[85vw] animate-rise flex-col ${sidebarSurface}`}>
            <SidebarContent brand={brand} nav={nav} collapsed={false} logoutLabel={labels.logout} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-1.5 border-b border-border bg-surface/90 px-2 backdrop-blur print:hidden sm:gap-2 lg:px-5">
          <button
            type="button"
            aria-label={labels.menu}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOn(drawerOpen ? null : pathname)}
            className={`${iconButton} inline-flex lg:hidden`}
          >
            {icons.menu}
          </button>
          <button
            type="button"
            aria-label={labels.menu}
            aria-pressed={collapsed}
            onClick={toggleCollapsed}
            className={`${iconButton} hidden lg:inline-flex`}
          >
            {icons.menu}
          </button>

          <p className="min-w-0 flex-1 truncate font-semibold">{current?.label ?? brand}</p>

          {search ? (
            <form action={search.href} role="search" className="relative hidden md:block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                {icons.search}
              </span>
              <input
                ref={searchRef}
                type="search"
                name="q"
                placeholder={search.placeholder}
                aria-label={search.placeholder}
                className={`h-11 w-56 rounded-xl border border-border bg-surface-2 pl-10 pr-16 text-sm placeholder:text-muted xl:w-72 ${focusRing}`}
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-muted">
                Ctrl K
              </kbd>
            </form>
          ) : null}

          {/* Espace courant ; déroule la liste des espaces de l'utilisateur. */}
          <div className="hidden sm:block">
            <Dropdown
              label={labels.spaces}
              trigger={
                <span className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold">
                  <span aria-hidden className="size-2 rounded-full bg-primary" />
                  <span className="max-w-32 truncate">{brand}</span>
                  {icons.chevronDown}
                </span>
              }
            >
              {spaces.map((space) => (
                <Link key={space.href} href={space.href} className={menuItem}>
                  <span
                    aria-hidden
                    className={`size-2 shrink-0 rounded-full ${space.current ? "bg-primary" : "bg-border"}`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{space.label}</span>
                    <span className="block truncate text-xs text-muted">{space.hint}</span>
                  </span>
                </Link>
              ))}
            </Dropdown>
          </div>

          {primaryAction ? (
            <Link
              href={primaryAction.href}
              className={`hidden min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary shadow-card hover:bg-primary-hover md:inline-flex ${focusRing}`}
            >
              {icons.plus}
              {primaryAction.label}
            </Link>
          ) : null}

          <button
            type="button"
            aria-label={labels.theme}
            onClick={toggleTheme}
            className={`${iconButton} inline-flex`}
          >
            {theme === "dark" ? icons.sun : icons.moon}
          </button>

          <Dropdown
            label={labels.alerts}
            trigger={
              <span className="relative inline-flex size-9 items-center justify-center text-muted">
                {icons.bell}
                {alerts.length > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-surface">
                    {alerts.length}
                  </span>
                ) : null}
              </span>
            }
          >
            <p className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted">
              {labels.alerts}
            </p>
            {alerts.length === 0 ? (
              <p className="px-3 pb-3 text-sm text-muted">{labels.noAlerts}</p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {alerts.map((alert) => (
                  <Link key={alert.key} href={alert.href} className={`${menuItem} py-2`}>
                    <span className="text-danger">{icons.alert}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{alert.title}</span>
                      <span className="block text-xs text-muted">{alert.detail}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Dropdown>

          <Dropdown
            label={labels.account}
            trigger={
              <>
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                  {initials}
                </span>
                <span className="hidden min-w-0 text-left leading-tight xl:block">
                  <span className="block max-w-36 truncate text-sm font-semibold">{user.name}</span>
                  <span className="block text-xs font-medium text-primary">{user.role}</span>
                </span>
                <span className="hidden text-muted xl:block">{icons.chevronDown}</span>
              </>
            }
          >
            <div className="border-b border-border px-3 pb-3 pt-2">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="text-xs font-medium text-primary">{user.role}</p>
            </div>
            <div className="pt-2">
              <Link href="/account" className={menuItem}>
                {icons.account}
                {labels.account}
              </Link>
              <Link href="/?spaces=1" className={menuItem}>
                {icons.spaces}
                {labels.spaces}
              </Link>
              <div className="flex items-center justify-between gap-2 px-3 py-1">
                <span className="text-sm font-medium">{labels.palette}</span>
                <PalettePicker />
              </div>
              <button type="button" onClick={logout} className={`${menuItem} text-danger`}>
                {icons.logout}
                {labels.logout}
              </button>
            </div>
          </Dropdown>
        </header>

        <main className="flex-1 px-4 pb-32 pt-5 lg:px-8 lg:pb-10 lg:pt-8">
          <div className="mx-auto w-full max-w-6xl">
            <OfflineBanner userId={user.id} />
            <SyncBanner userId={user.id} />
            {children}
          </div>
        </main>

        {/* Téléphone : barre flottante, avec l'action principale au centre. */}
        <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-1 rounded-3xl border border-border bg-surface/95 p-1.5 shadow-card backdrop-blur print:hidden lg:hidden">
          {tabs.slice(0, half).map(tab)}
          {primaryAction ? (
            <Link
              href={primaryAction.href}
              aria-label={primaryAction.label}
              className={`-mt-7 inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-card ring-4 ring-bg transition active:scale-95 ${focusRing}`}
            >
              {icons.plus}
            </Link>
          ) : null}
          {tabs.slice(half).map(tab)}
          {overflow ? (
            <button
              type="button"
              onClick={() => setDrawerOn(pathname)}
              className={`${tabBase} text-muted`}
            >
              {icons.more}
              <span className="max-w-full truncate px-1">{labels.more}</span>
            </button>
          ) : null}
        </nav>
      </div>
    </div>
  );
}
