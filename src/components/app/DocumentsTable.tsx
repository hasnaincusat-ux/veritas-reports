"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpDown, FileText, Search, X } from "lucide-react";
import { StatusBadge } from "./submission";
import { EmptyState } from "@/components/ui";
import { cn, formatBytes, scoreBand, timeAgo } from "@/lib/utils";

export type DocRow = {
  id: string;
  reference: string;
  title: string;
  fileSize: number;
  status: string;
  similarityScore: number | null;
  aiScore: number | null;
  createdAt: Date;
};

const STATUS_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "In progress" },
  { key: "COMPLETED", label: "Ready" },
  { key: "FAILED", label: "Failed" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

const RANGES = [
  { key: "all", label: "Any time", days: Infinity },
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
] as const;

const SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "sim-desc", label: "Similarity: high → low" },
  { key: "sim-asc", label: "Similarity: low → high" },
  { key: "ai-desc", label: "AI writing: high → low" },
  { key: "title", label: "Title A → Z" },
] as const;

type StatusKey = (typeof STATUS_FILTERS)[number]["key"];
type RangeKey = (typeof RANGES)[number]["key"];
type SortKey = (typeof SORTS)[number]["key"];

function matchesStatus(status: string, key: StatusKey) {
  if (key === "ALL") return true;
  if (key === "ACTIVE") return status === "QUEUED" || status === "PROCESSING";
  return status === key;
}

/** Nulls sort last regardless of direction so unscored rows never lead. */
function byScore(a: number | null, b: number | null, dir: 1 | -1) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * dir;
}

const SELECT =
  "h-9 rounded-pill border border-ink/15 bg-surface pl-3 pr-8 text-sm font-medium text-ink focus:border-brand-600";

/**
 * Filters run in the browser: the full list is already loaded, so every
 * keystroke and chip click is instant with no round trip.
 */
export function DocumentsTable({
  docs,
  hrefBase,
  emptyAction,
}: {
  docs: DocRow[];
  /** Row links are `${hrefBase}/${id}` — a string, because a server page cannot hand a function to a client component. */
  hrefBase: string;
  emptyAction?: React.ReactNode;
}) {
  const hrefFor = (id: string) => `${hrefBase}/${id}`;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusKey>("ALL");
  const [range, setRange] = useState<RangeKey>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const counts = useMemo(() => {
    const c: Record<StatusKey, number> = {
      ALL: docs.length,
      ACTIVE: 0,
      COMPLETED: 0,
      FAILED: 0,
      CANCELLED: 0,
    };
    for (const d of docs) {
      if (matchesStatus(d.status, "ACTIVE")) c.ACTIVE++;
      else if (d.status in c) c[d.status as StatusKey]++;
    }
    return c;
  }, [docs]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const days = RANGES.find((r) => r.key === range)!.days;
    const cutoff = Number.isFinite(days) ? Date.now() - days * 86400_000 : -Infinity;

    const rows = docs.filter(
      (d) =>
        matchesStatus(d.status, status) &&
        d.createdAt.getTime() >= cutoff &&
        (!q ||
          d.title.toLowerCase().includes(q) ||
          d.reference.toLowerCase().includes(q)),
    );

    rows.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.createdAt.getTime() - b.createdAt.getTime();
        case "sim-desc":
          return byScore(a.similarityScore, b.similarityScore, -1);
        case "sim-asc":
          return byScore(a.similarityScore, b.similarityScore, 1);
        case "ai-desc":
          return byScore(a.aiScore, b.aiScore, -1);
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });
    return rows;
  }, [docs, query, status, range, sort]);

  const filtered = query || status !== "ALL" || range !== "all";

  function reset() {
    setQuery("");
    setStatus("ALL");
    setRange("all");
    setSort("newest");
  }

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------ toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or reference…"
              className="h-10 w-full rounded-pill border border-ink/15 bg-surface pl-10 pr-9 text-sm placeholder:text-ink-faint focus:border-brand-600"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-pill text-ink-faint hover:bg-ink/5 hover:text-ink"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>

          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            className={SELECT}
            aria-label="Time range"
          >
            {RANGES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>

          <label className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className={cn(SELECT, "pl-8")}
              aria-label="Sort order"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatus(f.key)}
              aria-pressed={status === f.key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors",
                status === f.key
                  ? "bg-brand-600 text-white"
                  : "bg-surface text-ink-soft ring-1 ring-inset ring-ink/10 hover:text-ink",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-pill px-1.5 text-[10px] tabular-nums",
                  status === f.key ? "bg-surface/20" : "bg-ink/5",
                )}
              >
                {counts[f.key]}
              </span>
            </button>
          ))}

          {filtered ? (
            <button
              type="button"
              onClick={reset}
              className="ml-auto text-xs font-semibold text-brand-600 hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {/* -------------------------------------------------------------- table */}
      {docs.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" strokeWidth={1.3} />}
          title="No documents yet"
          body="Your first check will appear here the moment you upload it."
          action={emptyAction}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Search className="h-10 w-10" strokeWidth={1.3} />}
          title="Nothing matches"
          body="Try a different search term, status or time range."
          action={
            <button
              type="button"
              onClick={reset}
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-ink/10 bg-cream text-left">
              <tr className="micro-label">
                <th className="px-5 py-3">Document</th>
                <th className="hidden px-4 py-3 text-right md:table-cell">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 bg-brand-600" aria-hidden />
                    Similarity
                  </span>
                </th>
                <th className="hidden px-4 py-3 text-right md:table-cell">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 bg-plum" aria-hidden />
                    AI
                  </span>
                </th>
                <th className="px-4 py-3">Status</th>
                <th className="w-10 px-3 py-3" aria-label="Open" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {visible.map((d) => (
                <tr key={d.id} className="group transition-colors hover:bg-cream/70">
                  <td className="px-5 py-3.5">
                    <Link href={hrefFor(d.id)} className="block min-w-0">
                      <p className="truncate font-semibold group-hover:text-brand-600">
                        {d.title}
                      </p>
                      <p className="truncate text-xs text-ink-faint">
                        {d.reference} · {formatBytes(d.fileSize)} · {timeAgo(d.createdAt)}
                      </p>
                    </Link>
                  </td>
                  <ScoreCell value={d.similarityScore} ready={d.status === "COMPLETED"} />
                  <ScoreCell value={d.aiScore} ready={d.status === "COMPLETED"} />
                  <td className="px-4 py-3.5">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-3 py-3.5">
                    <Link
                      href={hrefFor(d.id)}
                      className="grid h-8 w-8 place-items-center rounded-pill text-ink-faint transition-colors group-hover:bg-brand-600 group-hover:text-white"
                      aria-label={`Open ${d.title}`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="border-t border-ink/10 px-5 py-2.5 text-xs text-ink-faint">
            Showing {visible.length} of {docs.length}
          </p>
        </div>
      )}
    </div>
  );
}

function ScoreCell({ value, ready }: { value: number | null; ready: boolean }) {
  return (
    <td className="hidden px-4 py-3.5 text-right md:table-cell">
      {ready && value !== null ? (
        <span className={cn("text-base font-bold tabular-nums", scoreBand(value).cls)}>
          {Math.round(value)}%
        </span>
      ) : (
        <span className="text-ink-faint">—</span>
      )}
    </td>
  );
}
