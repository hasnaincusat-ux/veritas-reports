"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { STATUS_META, type SubmissionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Event = { status: string; message: string; createdAt: string };

const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
const STEPS: SubmissionStatus[] = ["QUEUED", "PROCESSING", "COMPLETED"];
const POLL_MS = 8000;

/**
 * Polls while the job is still moving and stops once it reaches a terminal
 * state, so a finished page costs nothing. A status change triggers
 * router.refresh() to pull in the server-rendered scores and download links.
 */
export function LiveProgress({
  submissionId,
  initialStatus,
  initialEvents,
  token,
}: {
  submissionId: string;
  initialStatus: string;
  initialEvents: Event[];
  /** Share-link recipients have no session; the access token stands in for one. */
  token?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const statusRef = useRef(initialStatus);

  useEffect(() => {
    setStatus(initialStatus);
    setEvents(initialEvents);
    statusRef.current = initialStatus;
  }, [initialStatus, initialEvents]);

  useEffect(() => {
    if (TERMINAL.has(status)) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const qs = token ? `?t=${encodeURIComponent(token)}` : "";
        const res = await fetch(`/api/submissions/${submissionId}/status${qs}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;

        setEvents(data.events ?? []);
        if (data.status !== statusRef.current) {
          statusRef.current = data.status;
          setStatus(data.status);
          router.refresh();
        }
      } catch {
        /* transient network error — the next tick retries */
      }
    };

    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [status, submissionId, router, token]);

  const failed = status === "FAILED" || status === "CANCELLED";
  const currentStep = STATUS_META[status as SubmissionStatus]?.step ?? 1;

  return (
    <div className="space-y-6">
      {/* Step rail */}
      <ol className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const index = i + 1;
          const done = currentStep > index || status === "COMPLETED";
          const active = currentStep === index && !TERMINAL.has(status);
          const broken = failed && index === 3;

          return (
            <li key={step} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
                  broken
                    ? "bg-red-100 text-oxblood"
                    : done
                      ? "bg-brand-600 text-white"
                      : active
                        ? "bg-amber-400 text-ink"
                        : "bg-ink/10 text-ink-faint",
                )}
              >
                {broken ? (
                  <X className="h-4 w-4" strokeWidth={3} />
                ) : done ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  index
                )}
              </span>
              <span className="hidden text-xs font-medium text-ink-soft sm:block">
                {STATUS_META[step].label}
              </span>
              {i < STEPS.length - 1 ? (
                <span
                  className={cn(
                    "h-px flex-1 transition-colors",
                    currentStep > index ? "bg-brand-600" : "bg-ink/15",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Event timeline */}
      {events.length > 0 ? (
        <ul className="space-y-3 border-l border-ink/10 pl-5">
          {events.map((e, i) => (
            <li key={`${e.createdAt}-${i}`} className="relative">
              <span
                className={cn(
                  "absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white",
                  e.status === "FAILED" ? "bg-oxblood" : "bg-brand-600",
                )}
                aria-hidden
              />
              <p className="text-sm">{e.message}</p>
              <p className="text-xs text-ink-faint">
                {new Date(e.createdAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {!TERMINAL.has(status) ? (
        <p className="text-xs text-ink-faint">
          This page updates itself — you can leave it open or come back later.
        </p>
      ) : null}
    </div>
  );
}
