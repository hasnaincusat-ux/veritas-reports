"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { METRICS } from "@/lib/types";
import { cn, scoreBand } from "@/lib/utils";

const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
const POLL_MS = 8000;

const STEPS = ["QUEUED", "PROCESSING", "COMPLETED"] as const;

const LABEL: Record<string, string> = {
  QUEUED: "In queue",
  PROCESSING: "Analysing",
  COMPLETED: "Ready",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  IDLE: "Nothing running",
};

const STEP_INDEX: Record<string, number> = {
  QUEUED: 1,
  PROCESSING: 2,
  COMPLETED: 3,
  FAILED: 3,
  CANCELLED: 3,
};

export type LiveDoc = {
  id: string;
  title: string;
  status: string;
  similarityScore: number | null;
  aiScore: number | null;
} | null;

/**
 * Status of the most recent check. Polls only while it is still moving, then
 * stops and lets the server-rendered values stand.
 */
export function LiveDocPanel({ doc }: { doc: LiveDoc }) {
  const router = useRouter();
  const [status, setStatus] = useState(doc?.status ?? "IDLE");
  const statusRef = useRef(status);

  useEffect(() => {
    const next = doc?.status ?? "IDLE";
    setStatus(next);
    statusRef.current = next;
  }, [doc?.status, doc?.id]);

  useEffect(() => {
    if (!doc || TERMINAL.has(status)) return;

    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/submissions/${doc.id}/status`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && data.status !== statusRef.current) {
          statusRef.current = data.status;
          setStatus(data.status);
          router.refresh();
        }
      } catch {
        /* transient — the next tick retries */
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [doc, status, router]);

  const live = doc !== null && !TERMINAL.has(status);
  const failed = status === "FAILED" || status === "CANCELLED";
  const reached = doc ? (STEP_INDEX[status] ?? 0) : 0;

  return (
    <div className="card space-y-5 p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl2 bg-brand-50 text-brand-600">
          <FileText className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Latest check</p>
          <p className="truncate font-semibold">
            {doc ? doc.title : "Nothing uploaded yet"}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-bold",
            live
              ? "bg-mint-faint text-brand-700"
              : failed
                ? "bg-oxblood/10 text-oxblood"
                : "bg-ink/5 text-ink-soft",
          )}
        >
          {live ? (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-mint-deep" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint-deep" />
            </span>
          ) : null}
          {LABEL[status] ?? status}
        </span>
      </div>

      {/* Step rail */}
      <ol className="flex items-center gap-1.5">
        {STEPS.map((step, i) => {
          const index = i + 1;
          const done = reached > index || status === "COMPLETED";
          const active = reached === index && !TERMINAL.has(status);
          const broken = failed && index === 3;

          return (
            <li key={step} className="flex flex-1 items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 flex-1 rounded-pill transition-colors",
                  broken
                    ? "bg-oxblood"
                    : done
                      ? "bg-brand-600"
                      : active
                        ? "bg-highlight"
                        : "bg-ink/10",
                )}
              />
            </li>
          );
        })}
      </ol>

      <dl className="grid grid-cols-2 gap-3">
        {[
          { id: "similarity" as const, v: doc?.similarityScore ?? null },
          { id: "ai" as const, v: doc?.aiScore ?? null },
        ].map((m) => (
          <div key={m.id} className="rounded-xl2 border border-ink/10 bg-cream p-4">
            <dt className="micro-label flex items-center gap-1.5">
              <span
                className={cn("inline-block h-2 w-2", METRICS[m.id].chip)}
                aria-hidden
              />
              {METRICS[m.id].micro}
            </dt>
            <dd
              className={cn(
                "mt-0.5 font-display text-3xl font-semibold tabular-nums",
                m.v === null ? "text-ink-faint" : scoreBand(m.v).cls,
              )}
            >
              {m.v === null ? "—" : `${Math.round(m.v)}%`}
            </dd>
          </div>
        ))}
      </dl>

      {doc ? (
        <Link
          href={`/dashboard/submissions/${doc.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
        >
          Open full report
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <p className="text-sm text-ink-soft">
          Upload a document and its progress will appear here.
        </p>
      )}
    </div>
  );
}
