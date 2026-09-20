"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, FileText } from "lucide-react";
import { DocumentsTable, type DocRow } from "./DocumentsTable";
import { LiveDocPanel, type LiveDoc } from "./LiveDocPanel";
import { cn } from "@/lib/utils";

type PanelId = "documents" | "latest";

/**
 * Keeps the upload form the focus of the Check tab by tucking the document
 * list and the live status panel behind a segmented control underneath it.
 */
export function CheckPanels({
  docs,
  latest,
  hrefBase,
}: {
  docs: DocRow[];
  latest: LiveDoc;
  hrefBase: string;
}) {
  const [panel, setPanel] = useState<PanelId>("documents");

  const running = docs.filter(
    (d) => d.status === "QUEUED" || d.status === "PROCESSING",
  ).length;

  const tabs: Array<{
    id: PanelId;
    label: string;
    icon: typeof FileText;
    badge?: number;
  }> = [
    { id: "documents", label: "Your documents", icon: FileText, badge: docs.length },
    { id: "latest", label: "Latest check", icon: Activity, badge: running || undefined },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Check panels" className="flex flex-wrap gap-1.5">
          {tabs.map((t) => {
            const active = panel === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={active}
                aria-controls={`panel-${t.id}`}
                onClick={() => setPanel(t.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-brand-600 text-white"
                    : "bg-surface text-ink-soft ring-1 ring-inset ring-ink/10 hover:text-ink",
                )}
              >
                <t.icon className="h-4 w-4" strokeWidth={1.9} />
                {t.label}
                {t.badge !== undefined ? (
                  <span
                    className={cn(
                      "rounded-pill px-1.5 text-[10px] tabular-nums",
                      active ? "bg-surface/20" : "bg-ink/5",
                    )}
                  >
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {panel === "documents" ? (
          <Link
            href="/dashboard/submissions"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
          >
            Full archive <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>

      {panel === "documents" ? (
        <div role="tabpanel" id="panel-documents" aria-labelledby="tab-documents">
          <DocumentsTable docs={docs} hrefBase={hrefBase} />
        </div>
      ) : (
        <div
          role="tabpanel"
          id="panel-latest"
          aria-labelledby="tab-latest"
          className="max-w-xl"
        >
          <LiveDocPanel doc={latest} />
        </div>
      )}
    </section>
  );
}
