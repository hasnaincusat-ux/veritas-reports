"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, X } from "lucide-react";

/**
 * Thin promo strip above the nav. Dismissal is remembered per browser — it is
 * a convenience, so a blocked localStorage just means it shows again.
 */
export function AnnouncementBar({
  id = "private-workspaces",
  children,
  cta,
}: {
  id?: string;
  children: React.ReactNode;
  cta?: { href: string; label: string };
}) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(`dismissed:${id}`) === "1");
    } catch {
      setHidden(false);
    }
  }, [id]);

  if (hidden) return null;

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(`dismissed:${id}`, "1");
    } catch {
      /* not important enough to surface */
    }
  }

  return (
    <div className="bg-brand-700 text-brand-100">
      <div className="shell flex items-center gap-3 py-2 text-xs">
        <span className="hidden shrink-0 items-center gap-1.5 rounded-pill bg-surface/10 px-2 py-0.5 font-bold uppercase tracking-wide sm:inline-flex">
          <Lock className="h-3 w-3" />
          Private
        </span>

        <p className="min-w-0 flex-1 truncate text-brand-100">{children}</p>

        {cta ? (
          <Link
            href={cta.href}
            className="shrink-0 font-bold underline underline-offset-2 hover:text-mint"
          >
            {cta.label}
          </Link>
        ) : null}

        <button
          onClick={dismiss}
          className="shrink-0 rounded p-0.5 text-brand-300 transition-colors hover:text-white"
          aria-label="Dismiss announcement"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
