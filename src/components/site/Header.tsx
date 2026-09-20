import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { ROLE } from "@/lib/types";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#why", label: "Why us" },
  { href: "/#reviews", label: "Reviews" },
  { href: "/#contact", label: "Contact" },
];

export async function Header() {
  const user = await getCurrentUser();
  const home = user?.role === ROLE.ADMIN ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/85 backdrop-blur">
      <div className="shell flex h-18 items-center gap-6 py-4">
        <Logo />

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-pill px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {user ? (
            <ButtonLink href={home} size="sm">
              {user.role === ROLE.ADMIN ? "Admin panel" : "Dashboard"}
            </ButtonLink>
          ) : (
            <>
              <ButtonLink
                href="/login"
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" variant="primary" size="sm">
                Create account
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
