"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Coins,
  FileText,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquare,
  Settings,
  Star,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { cn } from "@/lib/utils";

/**
 * Icons are looked up by name here rather than passed in as components: a
 * server layout cannot hand a function across the client boundary.
 */
const ICONS = {
  coins: Coins,
  file: FileText,
  inbox: Inbox,
  dashboard: LayoutDashboard,
  queue: ListChecks,
  message: MessageSquare,
  settings: Settings,
  star: Star,
  upload: UploadCloud,
  users: Users,
} as const;

export type IconName = keyof typeof ICONS;
export type NavItem = { href: string; label: string; icon: IconName; badge?: number };

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({
  nav,
  header,
  children,
  rootHref,
}: {
  nav: NavItem[];
  header: React.ReactNode;
  children: React.ReactNode;
  rootHref: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (
    <nav className="space-y-1">
      {nav.map((item) => {
        const active = isActive(pathname, item.href, item.href === rootHref);
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl2 px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-600 text-white"
                : "text-ink-soft hover:bg-ink/5 hover:text-ink",
            )}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={1.8} />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span
                className={cn(
                  "rounded-pill px-2 py-0.5 text-[11px] font-semibold",
                  active ? "bg-surface/20 text-white" : "bg-amber-400 text-ink",
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-ink/10 bg-surface p-5 lg:flex">
        <Logo href={rootHref} />
        <div className="mt-8 flex-1">{links}</div>
        <div className="border-t border-ink/10 pt-4">{header}</div>
      </aside>

      {/* Mobile bar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-ink/10 bg-surface px-5 py-3 lg:hidden">
        <Logo href={rootHref} />
        <button
          onClick={() => setOpen((o) => !o)}
          className="ml-auto grid h-10 w-10 place-items-center rounded-xl2 border border-ink/15"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-b border-ink/10 bg-surface px-5 py-4 lg:hidden">
          {links}
          <div className="mt-4 border-t border-ink/10 pt-4">{header}</div>
        </div>
      ) : null}

      <div className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</div>
    </div>
  );
}
