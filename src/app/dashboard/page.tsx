import { Coins, FileCheck2, Files, Timer } from "lucide-react";
import { CheckPanels } from "@/components/app/CheckPanels";
import { UploadForm } from "@/components/app/UploadForm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Median turnaround of the last few completed checks — resistant to one slow outlier. */
async function typicalTurnaround() {
  const recent = await db.submission.findMany({
    where: { status: "COMPLETED", completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    take: 5,
    select: { createdAt: true, completedAt: true },
  });
  if (recent.length === 0) return null;

  const durations = recent
    .map((s) => s.completedAt!.getTime() - s.createdAt.getTime())
    .sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length / 2)];

  const mins = Math.round(median / 60_000);
  return mins < 1 ? "under a minute" : `~${mins} min`;
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [documents, avg] = await Promise.all([
    db.submission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        reference: true,
        title: true,
        fileSize: true,
        status: true,
        similarityScore: true,
        aiScore: true,
        createdAt: true,
      },
    }),
    typicalTurnaround(),
  ]);

  const latest = documents[0] ?? null;
  const ready = documents.filter((d) => d.status === "COMPLETED").length;
  const active = documents.filter(
    (d) => d.status === "QUEUED" || d.status === "PROCESSING",
  ).length;

  const stats = [
    { label: "Credits", value: user.credits, icon: Coins, accent: user.credits === 0 },
    { label: "Checks run", value: documents.length, icon: Files },
    { label: "Reports ready", value: ready, icon: FileCheck2 },
    { label: "Typical turnaround", value: avg ?? "—", icon: Timer },
  ];

  return (
    <div className="space-y-7">
      {/* --------------------------------------------------------------- head */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">New check</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Check a document
          </h1>
          <p className="mt-1.5 text-ink-soft">
            One credit returns a similarity report and an AI-writing report.
            {active > 0 ? ` ${active} check${active > 1 ? "s" : ""} running now.` : ""}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className={cn(
                "rounded-xl2 border border-ink/10 bg-surface px-3.5 py-2.5",
                s.accent && "border-highlight bg-highlight/15",
              )}
            >
              <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                <s.icon className="h-3 w-3" strokeWidth={2} />
                {s.label}
              </dt>
              <dd className="mt-0.5 truncate font-display text-lg font-semibold tabular-nums">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {/* ------------------------------------------------------- the main event */}
      <section className="card p-6 sm:p-8">
        <UploadForm credits={user.credits} />
      </section>

      {/* ------------------------------------------------------------ the rest */}
      <CheckPanels docs={documents} latest={latest} hrefBase="/dashboard/submissions" />
    </div>
  );
}
