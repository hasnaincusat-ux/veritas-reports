"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronDown,
  Coins,
  FileText,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { cn } from "@/lib/utils";

export type Tab = { href: string; label: string; exact?: boolean };

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function TopNav({
  tabs,
  user,
  logout,
  isAdmin,
}: {
  tabs: Tab[];
  user: { name: string; email: string; credits: number };
  logout: () => Promise<void>;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const tabLinks = tabs.map((t) => (
    <Link
      key={t.href}
      href={t.href}
      onClick={() => setNavOpen(false)}
      aria-current={isActive(pathname, t.href, t.exact) ? "page" : undefined}
      className={cn("pill-tab", isActive(pathname, t.href, t.exact) && "pill-tab-active")}
    >
      {t.label}
    </Link>
  ));

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/90 backdrop-blur">
      <div className="shell flex h-16 items-center gap-3">
        <Logo href="/dashboard" />

        <nav className="ml-4 hidden items-center gap-1 lg:flex">{tabLinks}</nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/dashboard/credits"
            className="hidden items-center gap-1.5 rounded-pill bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-700 ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-100 sm:inline-flex"
          >
            <Coins className="h-3.5 w-3.5" />
            {user.credits}
          </Link>

          {/* Account menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-pill border border-ink/10 py-1 pl-1 pr-2 transition-colors hover:bg-ink/5"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                {initials}
              </span>
              <span className="hidden max-w-[9rem] truncate text-sm font-semibold sm:block">
                {user.name}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-faint" />
            </button>

            {menuOpen ? (
              <>
                <button
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  tabIndex={-1}
                />
                <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl2 border border-ink/10 bg-surface shadow-lift">
                  <div className="border-b border-ink/10 px-4 py-3">
                    <p className="truncate text-sm font-bold">{user.name}</p>
                    <p className="truncate text-xs text-ink-faint">{user.email}</p>
                  </div>

                  {[
                    {
                      href: "/dashboard/submissions",
                      label: "My documents",
                      icon: FileText,
                    },
                    {
                      href: "/dashboard/credits",
                      label: "Credits & billing",
                      icon: Coins,
                    },
                    {
                      href: "/dashboard/settings",
                      label: "Account settings",
                      icon: Settings,
                    },
                    ...(isAdmin
                      ? [{ href: "/admin", label: "Admin panel", icon: ShieldCheck }]
                      : []),
                  ].map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
                    >
                      <i.icon className="h-4 w-4" />
                      {i.label}
                    </Link>
                  ))}

                  <form action={logout} className="border-t border-ink/10">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-oxblood transition-colors hover:bg-oxblood/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </form>
                </div>
              </>
            ) : null}
          </div>

          <button
            onClick={() => setNavOpen((o) => !o)}
            className="grid h-9 w-9 place-items-center rounded-pill border border-ink/10 lg:hidden"
            aria-label={navOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={navOpen}
          >
            {navOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {navOpen ? (
        <div className="flex flex-wrap gap-1.5 border-t border-ink/10 px-4 py-3 lg:hidden">
          {tabLinks}
        </div>
      ) : null}
    </header>
  );
}
