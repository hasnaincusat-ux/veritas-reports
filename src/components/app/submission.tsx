import Link from "next/link";
import { FileText, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui";
import {
  METRICS,
  STATUS_META,
  describeExclusions,
  type MetricId,
  type StoredExclusions,
  type SubmissionStatus,
} from "@/lib/types";
import { cn, formatBytes, scoreBand, timeAgo } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as SubmissionStatus];
  if (!meta)
    return <Badge className="bg-ink/5 text-ink-soft ring-ink/15">{status}</Badge>;
  return <Badge className={meta.tone}>{meta.label}</Badge>;
}

/**
 * Percentage gauge. The ring and label identify *which* reading this is; the
 * figure itself is coloured by severity, so the two signals never compete.
 */
export function ScoreDial({
  metric,
  value,
  size = 132,
}: {
  metric: MetricId;
  value: number | null;
  size?: number;
}) {
  const m = METRICS[metric];
  const pct = value ?? 0;
  const band = value === null ? null : scoreBand(pct);
  const r = size / 2 - 10;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="micro-label flex items-center gap-1.5">
        <span className={cn("inline-block h-2 w-2", m.chip)} aria-hidden />
        {m.micro}
      </p>

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            className="fill-none stroke-ink/10"
            strokeWidth={8}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            className={cn(
              "fill-none transition-[stroke-dashoffset] duration-700",
              value === null ? "stroke-ink/15" : m.ring,
            )}
            strokeWidth={8}
            strokeLinecap="butt"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          {value === null ? (
            <span className="font-display text-xl text-ink-faint">&mdash;</span>
          ) : (
            <span
              className={cn(
                "font-display text-3xl font-semibold tabular-nums",
                band?.cls,
              )}
            >
              {Math.round(value)}
              <span className="text-lg">%</span>
            </span>
          )}
        </div>
      </div>

      {band ? (
        <p className={cn("font-sans text-xs font-semibold", band.cls)}>{band.label}</p>
      ) : (
        <p className="font-sans text-xs text-ink-faint">Pending</p>
      )}
    </div>
  );
}

export type SubmissionRowData = {
  id: string;
  reference: string;
  title: string;
  fileSize: number;
  status: string;
  similarityScore: number | null;
  aiScore: number | null;
  createdAt: Date;
};

export function SubmissionRow({
  submission,
  href,
  extra,
}: {
  submission: SubmissionRowData;
  href: string;
  extra?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl2 border border-ink/10 bg-surface p-4 transition-all hover:border-ink/25 hover:shadow-soft"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl2 bg-brand-50 text-brand-600">
        <FileText className="h-5 w-5" strokeWidth={1.7} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{submission.title}</p>
        <p className="mt-0.5 truncate text-xs text-ink-faint">
          {submission.reference} · {formatBytes(submission.fileSize)} ·{" "}
          {timeAgo(submission.createdAt)}
          {extra ? <> · {extra}</> : null}
        </p>
      </div>

      {submission.status === "COMPLETED" ? (
        <div className="hidden shrink-0 gap-5 text-right sm:flex">
          {[
            { label: "Similarity", v: submission.similarityScore },
            { label: "AI", v: submission.aiScore },
          ].map((m) => (
            <div key={m.label}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                {m.label}
              </p>
              <p
                className={cn(
                  "text-lg font-bold",
                  m.v === null ? "text-ink-faint" : scoreBand(m.v).cls,
                )}
              >
                {m.v === null ? "—" : `${Math.round(m.v)}%`}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <StatusBadge status={submission.status} />
    </Link>
  );
}

/**
 * Restates the exclusions a check was run with. Without this a similarity
 * number cannot be interpreted — 11% with quotes excluded is not the same
 * result as 11% with everything counted.
 */
export function ExclusionSummary({
  exclusions,
  tone = "plain",
}: {
  exclusions: StoredExclusions;
  tone?: "plain" | "panel";
}) {
  const items = describeExclusions(exclusions);
  const none =
    exclusions.smallMatchMode === "OFF" &&
    !exclusions.excludeBibliography &&
    !exclusions.excludeQuotes;

  return (
    <div
      className={cn(tone === "panel" && "rounded-xl2 border border-ink/10 bg-cream p-4")}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
        Report filters applied
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((label) => (
          <li
            key={label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
              none
                ? "bg-ink/5 text-ink-soft ring-ink/10"
                : "bg-brand-50 text-brand-700 ring-brand-200",
            )}
          >
            <SlidersHorizontal className="h-3 w-3" strokeWidth={2.2} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
