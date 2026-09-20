import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "./Logo";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "Veritas Reports";

const POINTS = [
  "One upload, two reports — similarity and AI writing",
  "Checked in no-repository mode, so nothing is indexed",
  "Your original file is erased after seven days",
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — hidden on small screens so the form gets the space. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-12 lg:flex">
        <div
          className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-surface/15 blur-3xl"
          aria-hidden
        />
        <span className="relative flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl2 bg-surface/20 text-white">
            <svg
              viewBox="0 0 24 24"
              className="h-4.5 w-4.5"
              fill="none"
              strokeWidth={2.4}
            >
              <path
                d="M12 3 4.5 6.2v5.1c0 4.4 3 8.4 7.5 9.7 4.5-1.3 7.5-5.3 7.5-9.7V6.2L12 3Z"
                stroke="currentColor"
                strokeLinejoin="round"
              />
              <path
                d="m8.8 11.8 2.3 2.3 4.1-4.6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-lg font-bold tracking-tight text-white">{SITE}</span>
        </span>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight text-white">
            Know your score before it counts.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-white/90">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface/20">
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </span>
                <span className="text-sm leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/70">
          {SITE} is an independent service, not affiliated with Turnitin LLC.
        </p>
      </aside>

      <main className="flex items-center justify-center bg-surface px-5 py-14 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>

          <h1 className="mt-8 text-3xl font-bold tracking-tight lg:mt-0">{title}</h1>
          <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <p className="mt-8 text-center text-sm text-ink-soft">{footer}</p>

          <p className="mt-10 text-center text-xs text-ink-faint">
            <Link href="/" className="hover:text-ink">
              ← Back to homepage
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
