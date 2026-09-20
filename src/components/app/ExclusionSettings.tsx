"use client";

import { useState } from "react";
import { BookMarked, Quote, Scissors } from "lucide-react";
import { SMALL_MATCH, type SmallMatchMode } from "@/lib/types";
import { cn } from "@/lib/utils";

function ToggleRow({
  name,
  icon: Icon,
  title,
  blurb,
  defaultChecked,
}: {
  name: string;
  icon: typeof Quote;
  title: string;
  blurb: string;
  defaultChecked: boolean;
}) {
  const [on, setOn] = useState(defaultChecked);

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl2 border p-3.5 transition-colors",
        on
          ? "border-brand-600/40 bg-brand-50"
          : "border-ink/10 bg-surface hover:border-ink/25",
      )}
    >
      {/* Unchecked boxes send nothing, which parseExclusions reads as false. */}
      <input
        type="checkbox"
        name={name}
        checked={on}
        onChange={(e) => setOn(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
      />
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          on ? "text-brand-600" : "text-ink-faint",
        )}
        strokeWidth={1.9}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs leading-relaxed text-ink-soft">{blurb}</span>
      </span>
    </label>
  );
}

/**
 * What Turnitin calls exclusions. These change the similarity number itself, so
 * they are chosen per upload and restated on the finished report.
 */
export function ExclusionSettings({
  defaults,
}: {
  defaults?: {
    excludeBibliography?: boolean;
    excludeQuotes?: boolean;
    smallMatchMode?: SmallMatchMode;
    smallMatchValue?: number | null;
  };
}) {
  const [mode, setMode] = useState<SmallMatchMode>(
    defaults?.smallMatchMode ?? SMALL_MATCH.OFF,
  );

  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-2 text-sm font-semibold">
        Report filters
        <span className="ml-2 font-normal text-ink-faint">
          what to leave out of the similarity score
        </span>
      </legend>

      <ToggleRow
        name="excludeBibliography"
        icon={BookMarked}
        title="Exclude bibliography"
        blurb="Skip the reference list, so cited sources do not inflate the match."
        defaultChecked={defaults?.excludeBibliography ?? true}
      />

      <ToggleRow
        name="excludeQuotes"
        icon={Quote}
        title="Exclude quoted text"
        blurb="Skip material inside quotation marks and block quotes."
        defaultChecked={defaults?.excludeQuotes ?? true}
      />

      <div
        className={cn(
          "rounded-xl2 border p-3.5 transition-colors",
          mode !== SMALL_MATCH.OFF
            ? "border-brand-600/40 bg-brand-50"
            : "border-ink/10 bg-surface",
        )}
      >
        <div className="flex items-start gap-3">
          <Scissors
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              mode !== SMALL_MATCH.OFF ? "text-brand-600" : "text-ink-faint",
            )}
            strokeWidth={1.9}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Exclude small matches</p>
            <p className="text-xs leading-relaxed text-ink-soft">
              Ignore short overlaps like common phrases and headings.
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <select
                name="smallMatchMode"
                value={mode}
                onChange={(e) => setMode(e.target.value as SmallMatchMode)}
                className="h-9 rounded-pill border border-ink/15 bg-surface pl-3 pr-8 text-sm font-medium"
                aria-label="Small match exclusion mode"
              >
                <option value={SMALL_MATCH.OFF}>Do not exclude</option>
                <option value={SMALL_MATCH.WORDS}>Fewer than … words</option>
                <option value={SMALL_MATCH.PERCENT}>Less than … percent</option>
              </select>

              {mode !== SMALL_MATCH.OFF ? (
                <span className="inline-flex items-center gap-1.5">
                  <input
                    type="number"
                    name="smallMatchValue"
                    min={1}
                    max={mode === SMALL_MATCH.PERCENT ? 100 : 1000}
                    defaultValue={
                      defaults?.smallMatchValue ?? (mode === SMALL_MATCH.PERCENT ? 1 : 10)
                    }
                    required
                    className="h-9 w-20 rounded-pill border border-ink/15 bg-surface px-3 text-sm tabular-nums"
                    aria-label="Small match threshold"
                  />
                  <span className="text-sm text-ink-soft">
                    {mode === SMALL_MATCH.PERCENT ? "%" : "words"}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
