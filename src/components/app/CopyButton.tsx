"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the value is visible on screen to select by hand */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border border-ink/15 bg-surface px-3 py-1.5 text-xs font-semibold transition-colors hover:border-ink/30",
        copied && "border-mint-deep text-brand-700",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}
