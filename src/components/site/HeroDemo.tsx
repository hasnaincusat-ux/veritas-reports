"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookMarked,
  BookOpen,
  FileText,
  Globe,
  Quote,
  TextQuote,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Two pages of a real Turnitin report, shown as a stack that alternates:
 * the similarity "Integrity Overview" and the "AI Writing Overview".
 * Layout, wording and submission ids follow the genuine documents.
 */

const SUBMISSION_ID = "trn:oid:::3618:152306251";

const MATCH_GROUPS = [
  {
    icon: FileText,
    tint: "bg-[#FCE1EC] text-[#D6246E]",
    n: 28,
    label: "Not Cited or Quoted",
    pct: "22%",
    note: "Matches with neither in-text citation nor quotation marks",
  },
  {
    icon: Quote,
    tint: "bg-[#FFE9D6] text-[#E8833A]",
    n: 6,
    label: "Missing Quotations",
    pct: "4%",
    note: "Matches that are still very similar to source material",
  },
  {
    icon: TextQuote,
    tint: "bg-[#FFF5D6] text-[#C9A21B]",
    n: 0,
    label: "Missing Citation",
    pct: "0%",
    note: "Matches that have quotation marks, but no in-text citation",
  },
  {
    icon: BookMarked,
    tint: "bg-[#DDF2E9] text-[#0F7B63]",
    n: 0,
    label: "Cited and Quoted",
    pct: "0%",
    note: "Matches with in-text citation present, but no quotation marks",
  },
];

const TOP_SOURCES = [
  { pct: "21%", icon: Globe, label: "Internet sources" },
  { pct: "9%", icon: BookOpen, label: "Publications" },
  { pct: "19%", icon: User, label: "Submitted works (Student Papers)" },
];

const SWAP_MS = 5200;

export function HeroDemo() {
  const [front, setFront] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) return;
    const id = setInterval(() => setFront((f) => (f === 0 ? 1 : 0)), SWAP_MS);
    return () => clearInterval(id);
  }, []);

  const pages = [
    {
      key: "similarity",
      label: "Page 2 of 8 - Integrity Overview",
      body: <SimilarityBody />,
    },
    { key: "ai", label: "Page 2 of 11 - AI Writing Overview", body: <AiBody /> },
  ];

  return (
    <div className="relative mb-7 h-[430px] sm:h-[452px]">
      {pages.map((p, i) => {
        const isFront = i === front;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => setFront(i)}
            aria-label={`Show ${p.key === "ai" ? "AI writing" : "similarity"} report`}
            className={cn(
              "absolute inset-0 text-left transition-all duration-700 ease-out",
              isFront
                ? "z-20 translate-x-0 translate-y-0 scale-100 opacity-100"
                : "z-10 translate-x-5 -translate-y-5 scale-[.96] opacity-60",
            )}
          >
            <ReportPage label={p.label} dimmed={!isFront}>
              {p.body}
            </ReportPage>
          </button>
        );
      })}

      {/* Which sheet is on top */}
      <div className="absolute -bottom-5 left-0 right-0 z-30 flex justify-center gap-1.5">
        {pages.map((p, i) => (
          <span
            key={p.key}
            className={cn(
              "h-1 rounded-pill transition-all",
              i === front ? "w-5 bg-brand-600" : "w-1.5 bg-ink/20",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** The turnitin page chrome: running header and footer on every page. */
function ReportPage({
  label,
  dimmed,
  children,
}: {
  label: string;
  dimmed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[3px] border bg-surface shadow-lift transition-colors",
        dimmed ? "border-ink/10" : "border-ink/15",
      )}
    >
      <RunningBand label={label} />
      <div className="flex-1 overflow-hidden px-5 py-4">{children}</div>
      <RunningBand label={label} bottom />
    </div>
  );
}

function RunningBand({ label, bottom = false }: { label: string; bottom?: boolean }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 px-4 py-2",
        bottom ? "border-t border-ink/10" : "border-b border-ink/10",
      )}
    >
      <TurnitinMark />
      <span className="truncate text-[7.5px] text-ink-soft">{label}</span>
      <span className="ml-auto hidden shrink-0 text-[7.5px] text-ink-faint sm:block">
        Submission ID&nbsp;&nbsp;{SUBMISSION_ID}
      </span>
    </div>
  );
}

/** The provider wordmark as it appears on the delivered report. */
function TurnitinMark() {
  return (
    <span className="flex shrink-0 items-center gap-1" aria-label="turnitin">
      <svg viewBox="0 0 24 24" className="h-3 w-3 text-[#1B7FE3]" fill="currentColor">
        <path d="M7 2h7.5L9.8 8.6H14L7.6 22l1.9-9.2H5.2L7 2z" />
      </svg>
      <span className="text-[10px] font-medium lowercase tracking-tight text-[#0A1B2A]">
        turnitin
      </span>
    </span>
  );
}

/* ------------------------------------------------------------ page bodies */

function SimilarityBody() {
  return (
    <>
      <h3 className="flex items-baseline gap-2">
        <span className="text-[25px] font-bold leading-none tabular-nums text-ink">
          26%
        </span>
        <span className="text-[16px] font-semibold leading-none text-ink">
          Overall Similarity
        </span>
      </h3>
      <p className="mt-1.5 text-[8px] leading-snug text-ink-soft">
        The combined total of all matches, including overlapping sources, for each
        database.
      </p>

      <p className="mt-3 text-[10.5px] font-bold text-ink">Filtered from the Report</p>
      <ul className="mt-1">
        <li className="flex items-center gap-1.5 text-[8px] text-ink-soft">
          <span className="text-[5px] text-ink-faint">▶</span>
          Bibliography
        </li>
      </ul>

      <div className="my-2.5 border-t border-ink/10" />

      <div className="grid grid-cols-[1.35fr_1fr] gap-4">
        <div>
          <p className="mb-1.5 text-[10.5px] font-bold text-ink">Match Groups</p>
          <ul className="space-y-1.5">
            {MATCH_GROUPS.map((g) => (
              <li key={g.label} className="flex gap-1.5">
                <span
                  className={cn(
                    "mt-[1px] grid h-[12px] w-[12px] shrink-0 place-items-center rounded-[3px]",
                    g.tint,
                  )}
                >
                  <g.icon className="h-[7px] w-[7px]" strokeWidth={2.5} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[8px] leading-tight">
                    <span className="font-bold text-ink">{g.n}</span>{" "}
                    <span className="text-ink">{g.label}</span>{" "}
                    <span className="font-bold text-ink">{g.pct}</span>
                  </span>
                  <span className="mt-[1px] block text-[7px] leading-tight text-ink-faint">
                    {g.note}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-1.5 text-[10.5px] font-bold text-ink">Top Sources</p>
          <ul className="space-y-1.5">
            {TOP_SOURCES.map((s) => (
              <li key={s.label} className="flex items-center gap-1.5 text-[8px]">
                <span className="w-5 shrink-0 tabular-nums text-ink">{s.pct}</span>
                <s.icon
                  className="h-[8px] w-[8px] shrink-0 text-ink-soft"
                  strokeWidth={2}
                />
                <span className="min-w-0 truncate text-ink">{s.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="my-2.5 border-t border-ink/10" />

      <div className="grid grid-cols-[1fr_1.35fr] gap-4">
        <div>
          <p className="text-[10.5px] font-bold text-ink">Integrity Flags</p>
          <p className="mt-1.5 text-[8px] font-bold text-ink">
            0 Integrity Flags for Review
          </p>
        </div>
        <div className="rounded-[10px] bg-[#D6E9FB] px-3 py-2">
          <p className="text-[7px] leading-snug text-[#1B3A5B]">
            Our system&rsquo;s algorithms look deeply at a document for any
            inconsistencies that would set it apart from a normal submission. If we notice
            something strange, we flag it for you to review.
          </p>
          <p className="mt-1.5 text-[7px] leading-snug text-[#1B3A5B]">
            A Flag is not necessarily an indicator of a problem. However, we&rsquo;d
            recommend you focus your attention there for further review.
          </p>
        </div>
      </div>
    </>
  );
}

function AiBody() {
  return (
    <>
      <div className="grid grid-cols-[1.15fr_1fr] gap-4">
        <div>
          <h3 className="text-[25px] font-bold leading-none text-ink">
            *% <span className="font-bold">detected as AI</span>
          </h3>
          <p className="mt-2 text-[8px] leading-snug text-ink-soft">
            AI detection includes the possibility of false positives. Although some text
            in this submission is likely AI generated, scores below the 20% threshold are
            not surfaced because they have a higher likelihood of false positives.
          </p>
        </div>

        <div className="rounded-[10px] bg-[#D6E9FB] px-3 py-2.5">
          <p className="text-[7.5px] font-bold text-[#1B3A5B]">
            Caution: Review required.
          </p>
          <p className="mt-1.5 text-[7px] leading-snug text-[#1B3A5B]">
            It is essential to understand the limitations of AI detection before making
            decisions about a student&rsquo;s work. We encourage you to learn more about
            Turnitin&rsquo;s AI detection capabilities before using the tool.
          </p>
        </div>
      </div>

      <div className="my-3 border-t border-ink/10" />

      <p className="text-[8px] font-bold text-ink">Disclaimer</p>
      <p className="mt-1 text-[7px] leading-snug text-ink-soft">
        Our AI writing assessment is designed to help educators identify text that might
        be prepared by a generative AI tool. Our AI writing assessment may not always be
        accurate (it may misidentify writing that is likely human generated as AI
        generated and likely AI generated as human generated) so it should not be used as
        the sole basis for adverse actions against a student. It takes further scrutiny
        and human judgment in conjunction with an organization&rsquo;s application of its
        specific academic policies to determine whether any academic misconduct has
        occurred.
      </p>

      <div className="my-3 border-t border-ink/10" />
    </>
  );
}
