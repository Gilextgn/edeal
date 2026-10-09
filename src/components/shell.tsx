"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";
import { usePersistentFlag, useTheme } from "@/lib/browser-store";
import { clearOfflinePages } from "@/lib/offline/pages";
import { icons, type IconName } from "./icons";
import { OfflineBanner } from "./offline";
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
    back: string;
    // « Bonjour, Awa » : affiché au-dessus du nom sur l'accueil, sur téléphone.
    hello: string;
    more: string;
    theme: string;
    alerts: string;
    noAlerts: string;
    spaces: string;
    account: string;
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

// Écran parent d'un écran secondaire : on retire le dernier segment de
// l'adresse, ainsi que les segments qui ne sont pas des écrans à eux seuls.
function parentPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  parts.pop();
  while (["reports", "shops"].includes(parts.at(-1) ?? "")) parts.pop();
  // « /s/<boutique> » et « /perso » sont les accueils ; « /s » n'existe pas.
  if (parts.length === 1 && parts[0] === "s") parts.pop();
  return `/${parts.join("/")}`;
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
        className={`flex min-h-11 items-center gap-2 rounded-full px-1 hover:bg-surface-2 ${focusRing}`}
      >
        {trigger}
      </button>
      {open ? (
        <div
          className={`absolute top-full z-30 mt-3 w-72 max-w-[calc(100vw-1.5rem)] animate-rise rounded-3xl bg-surface p-2 shadow-pop ${align === "right" ? "right-0" : "left-0"}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

const menuItem = `flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-medium hover:bg-surface-2 ${focusRing}`;

function SidebarContent({
  brand,
  nav,
  collapsed,
  logoutLabel,
  user,
  initials,
}: {
  brand: string;
  nav: NavItem[];
  collapsed: boolean;
  logoutLabel: string;
  user: ShellProps["user"];
  initials: string;
}) {
  const pathname = usePathname();
  const item = `flex min-h-12 items-center gap-3 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${collapsed ? "justify-center px-0" : ""}`;

  return (
    <>
      <div className={`flex h-20 shrink-0 items-center gap-3 ${collapsed ? "justify-center px-2" : "px-5"}`}>
        <BrandMark name={brand} />
        {collapsed ? null : (
          <p className="truncate text-lg font-extrabold tracking-tight">{brand}</p>
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
              className={`${item} ${active ? "bg-primary text-on-primary" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
            >
              {icons[entry.icon]}
              {collapsed ? <span className="sr-only">{entry.label}</span> : entry.label}
            </Link>
          );
        })}
      </nav>
      {/* Pied du menu : qui est connecté, et la déconnexion. */}
      <div className="p-3">
        <div
          className={`flex items-center gap-3 rounded-3xl bg-surface-2 ${collapsed ? "flex-col p-1.5" : "p-2 pl-3"}`}
        >
          {collapsed ? null : (
            <>
              <span
                aria-hidden
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary"
              >
                {initials}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-semibold">{user.name}</span>
                <span className="block truncate text-xs text-muted">{user.role}</span>
              </span>
            </>
          )}
          <button
            type="button"
            title={logoutLabel}
            aria-label={logoutLabel}
            onClick={logout}
            className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-danger ${focusRing}`}
          >
            {icons.logout}
          </button>
        </div>
      </div>
    </>
  );
}

// Efface les pages gardées sur le téléphone avant de fermer la session.
async function logout() {
  await clearOfflinePages();
  await signOut();
}

const sidebarSurface = "bg-surface shadow-card";

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
  const isRoot = nav.some((entry) => entry.href.split("?")[0] === pathname);
  const atHome = nav[0]?.href.split("?")[0] === pathname;
  const backHref = isRoot ? null : parentPath(pathname);
  const squareButton = `size-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-fg shadow-card transition-colors hover:bg-surface-2 ${focusRing}`;
  // Barre du bas : l'action principale prend une place au centre.
  const slots = primaryAction ? MAX_TABS - 1 : MAX_TABS;
  const overflow = nav.length > slots;
  const tabs = overflow ? nav.slice(0, slots - 1) : nav;
  const half = Math.ceil((tabs.length + (overflow ? 1 : 0)) / 2);
  const tabBase =
    "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";
  const tab = (entry: NavItem) => {
    const active = isActive(pathname, entry);
    return (
      <Link
        key={entry.href}
        href={entry.href}
        aria-current={active ? "page" : undefined}
        className={`${tabBase} ${active ? "text-primary" : "text-muted"}`}
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
  const iconButton = `relative size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg ${focusRing}`;

  return (
    <div className="flex min-h-dvh">
      {/* Menu latéral, ordinateur : repliable en bande d'icônes. */}
      {/* Il flotte sur le fond, comme une carte, détaché des bords. */}
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 py-3 pl-3 transition-[width] duration-200 print:!hidden lg:block ${collapsed ? "w-[92px]" : "w-[17rem]"}`}
      >
        <div className={`flex h-full flex-col overflow-hidden rounded-[1.75rem] ${sidebarSurface}`}>
          <SidebarContent
            brand={brand}
            nav={nav}
            collapsed={collapsed}
            logoutLabel={labels.logout}
            user={user}
            initials={initials}
          />
        </div>
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
          <aside
            className={`relative flex h-full w-72 max-w-[85vw] animate-rise flex-col overflow-hidden rounded-r-[1.75rem] ${sidebarSurface}`}
          >
            <SidebarContent
              brand={brand}
              nav={nav}
              collapsed={false}
              logoutLabel={labels.logout}
              user={user}
              initials={initials}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre du haut, sans fond propre : à gauche le titre, au centre la
            recherche (elle prend la place libre), à droite les actions. */}
        <header className="sticky top-0 z-20 bg-bg/85 px-3 backdrop-blur-md print:hidden lg:px-8">
          {/* Même largeur que le contenu : les bords s'alignent sur grand écran. */}
          <div className="mx-auto flex h-[4.5rem] w-full max-w-[90rem] items-center gap-2.5 lg:h-20 lg:gap-3">
          <button
            type="button"
            aria-label={labels.menu}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOn(drawerOpen ? null : pathname)}
            className={`${squareButton} ${backHref ? "hidden" : "inline-flex lg:hidden"}`}
          >
            {icons.menu}
          </button>
          {/* Écran secondaire : une flèche ramène à l'écran d'où l'on vient. */}
          {backHref ? (
            <Link href={backHref} aria-label={labels.back} className={`${squareButton} inline-flex`}>
              {icons.chevronLeft}
            </Link>
          ) : null}
          <button
            type="button"
            aria-label={labels.menu}
            aria-pressed={collapsed}
            onClick={toggleCollapsed}
            className={`${iconButton} hidden lg:inline-flex`}
          >
            {icons.menu}
          </button>

          {/* Sur ordinateur, le menu latéral et le titre de la page disent déjà
              où l'on est : ce rappel ne sert que sur petit écran. */}
          <div className="min-w-0 flex-1 lg:hidden">
            {atHome ? (
              <>
                <p className="truncate text-xs font-medium text-muted">{labels.hello}</p>
                <p className="truncate text-xl leading-tight font-extrabold tracking-tight text-primary">
                  {brand}
                </p>
              </>
            ) : (
              <p className="truncate text-lg font-bold tracking-tight">{current?.label ?? brand}</p>
            )}
          </div>

          {search ? (
            <form
              action={search.href}
              role="search"
              className="relative hidden min-w-40 flex-1 md:block md:max-w-xs lg:mx-auto lg:max-w-xl"
            >
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                {icons.search}
              </span>
              <input
                ref={searchRef}
                type="search"
                name="q"
                placeholder={search.placeholder}
                aria-label={search.placeholder}
                className={`h-12 w-full rounded-full bg-surface pl-12 pr-20 text-sm shadow-card placeholder:text-muted ${focusRing}`}
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-muted xl:block">
                Ctrl K
              </kbd>
            </form>
          ) : (
            <div className="hidden flex-1 lg:block" />
          )}

          {/* Espace courant ; déroule la liste des espaces de l'utilisateur. */}
          <div className="hidden sm:block">
            <Dropdown
              label={labels.spaces}
              trigger={
                <span className="flex h-12 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold shadow-card">
                  <span aria-hidden className="size-2 rounded-full bg-primary" />
                  <span className="max-w-28 truncate">{brand}</span>
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
              className={`hidden h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-5 whitespace-nowrap text-sm font-semibold text-on-primary shadow-card transition hover:bg-primary-hover active:scale-[0.98] md:inline-flex ${focusRing}`}
            >
              {icons.plus}
              {primaryAction.label}
            </Link>
          ) : null}

          {/* Thème, alertes et compte, réunis dans une même pastille. */}
          <div className="flex shrink-0 items-center rounded-full bg-surface p-0.5 shadow-card">
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
                <span className="hidden min-w-0 text-left leading-tight 2xl:block">
                  <span className="block max-w-36 truncate text-sm font-semibold">{user.name}</span>
                  <span className="block text-xs font-medium text-muted">{user.role}</span>
                </span>
                <span className="hidden pr-1 text-muted 2xl:block">{icons.chevronDown}</span>
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
              <button type="button" onClick={logout} className={`${menuItem} text-danger`}>
                {icons.logout}
                {labels.logout}
              </button>
            </div>
          </Dropdown>
          </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-32 pt-3 lg:px-8 lg:pb-10 lg:pt-2">
          <div className="mx-auto w-full max-w-[90rem]">
            <OfflineBanner userId={user.id} />
            <SyncBanner userId={user.id} />
            {children}
          </div>
        </main>

        {/* Téléphone : barre flottante, avec l'action principale au centre. */}
        <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-1 rounded-[1.75rem] bg-surface px-2 py-1 shadow-pop print:hidden lg:hidden">
          {tabs.slice(0, half).map(tab)}
          {primaryAction ? (
            <Link
              href={primaryAction.href}
              aria-label={primaryAction.label}
              className={`-mt-9 inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary shadow-pop ring-[5px] ring-bg transition active:scale-95 [&>svg]:size-7 ${focusRing}`}
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
