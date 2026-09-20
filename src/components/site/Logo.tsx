import Link from "next/link";
import { cn } from "@/lib/utils";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "Veritas Reports";
const [firstWord, ...restWords] = SITE.split(" ");

/** A pressed-seal mark beside a serif wordmark, as on a university masthead. */
export function Logo({
  href = "/",
  className,
  compact = false,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("group flex shrink-0 items-center gap-2.5", className)}
    >
      <span
        className="grid h-9 w-9 place-items-center border border-brand-600 bg-brand-600 text-cream transition-colors group-hover:bg-brand-700"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" strokeWidth={1.6}>
          <path
            d="M12 3.2 5 6v5.2c0 4.2 2.9 7.9 7 9.1 4.1-1.2 7-4.9 7-9.1V6l-7-2.8Z"
            stroke="currentColor"
            strokeLinejoin="round"
          />
          <path
            d="m9 11.9 2.2 2.2L15.4 9.6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {!compact ? (
        <span className="leading-none">
          <span className="block font-display text-[17px] font-semibold tracking-tight text-ink">
            {firstWord}
          </span>
          <span className="mt-0.5 block font-sans text-[9px] font-bold uppercase tracking-academic text-ink-faint">
            {restWords.join(" ") || "Reports"}
          </span>
        </span>
      ) : null}
    </Link>
  );
}
