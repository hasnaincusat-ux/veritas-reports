"use client";

import { useTransition } from "react";
import { Code2, Link2 } from "lucide-react";
import { FEATURES, type FeatureId } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON = { shareLinks: Link2, api: Code2 } as const;

export function FeatureToggles({
  userId,
  flags,
  counts,
  toggle,
}: {
  userId: string;
  flags: Record<FeatureId, boolean>;
  counts: Record<FeatureId, number>;
  toggle: (userId: string, feature: FeatureId, enabled: boolean) => Promise<void>;
}) {
  const [pending, start] = useTransition();

  return (
    <ul className="divide-y divide-ink/10">
      {(Object.keys(FEATURES) as FeatureId[]).map((id) => {
        const on = flags[id];
        const Icon = ICON[id];
        return (
          <li key={id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl2 bg-brand-50 text-brand-600">
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{FEATURES[id].label}</p>
              <p className="text-sm text-ink-soft">{FEATURES[id].blurb}</p>
              {counts[id] > 0 ? (
                <p className="mt-0.5 text-xs text-ink-faint">
                  {counts[id]} {id === "api" ? "key" : "link"}
                  {counts[id] === 1 ? "" : "s"} created so far
                </p>
              ) : null}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              disabled={pending}
              onClick={() => start(() => toggle(userId, id, !on))}
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-pill transition-colors disabled:opacity-50",
                on ? "bg-brand-600" : "bg-ink/15",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-pill bg-surface shadow transition-transform",
                  on ? "translate-x-6" : "translate-x-1",
                )}
              />
              <span className="sr-only">
                {on ? "Disable" : "Enable"} {FEATURES[id].label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
