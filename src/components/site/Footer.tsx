import Link from "next/link";
import { Logo } from "./Logo";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "Veritas Reports";

const SPECS = [
  { label: "Processing time", value: "5–10 mins" },
  { label: "Max file size", value: "100 MB" },
  { label: "File types", value: "PDF, DOCX, PPTX" },
  { label: "File retention", value: "Deleted after 7 days" },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-ink/10 bg-surface">
      <div className="shell grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
            Independent similarity and AI-writing checks on work you already own — so
            nothing reaches a marker before you have seen it yourself.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Secure", "Fast results", "Verified"].map((t) => (
              <span
                key={t}
                className="rounded-pill bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-inset ring-brand-200"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-mint">
            <span className="h-2 w-2 rounded-full bg-mint" aria-hidden />
            Service running normally
          </div>
        </div>

        <div>
          <h3 className="eyebrow mb-4">Product</h3>
          <ul className="space-y-2.5 text-sm">
            {[
              { href: "/#how", label: "How it works" },
              { href: "/#why", label: "Why us" },
              { href: "/#reviews", label: "Reviews" },
              { href: "/login", label: "Sign in" },
              { href: "/register", label: "Create account" },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-ink-soft transition-colors hover:text-brand-600"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="eyebrow mb-4">Document specs</h3>
          <dl className="space-y-2.5 text-sm">
            {SPECS.map((s) => (
              <div key={s.label} className="flex justify-between gap-4">
                <dt className="text-ink-faint">{s.label}</dt>
                <dd className="text-right font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="border-t border-ink/10">
        <div className="shell flex flex-col gap-3 py-5 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE}. All rights reserved.
          </p>
          <p className="max-w-xl sm:text-right">
            {SITE} is an independent service and is not affiliated with, endorsed by, or
            connected to Turnitin LLC.
          </p>
        </div>
      </div>
    </footer>
  );
}
