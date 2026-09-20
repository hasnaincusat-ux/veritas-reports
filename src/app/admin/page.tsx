import Link from "next/link";
import { ArrowRight, Clock, FileCheck2, ListChecks, Users } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { SubmissionRow } from "@/components/app/submission";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdmin();

  const since = new Date(Date.now() - 7 * 86400_000);

  const [queued, completedWeek, users, awaiting, recentLogs] = await Promise.all([
    db.submission.count({ where: { status: { in: ["QUEUED", "PROCESSING"] } } }),
    db.submission.count({
      where: { status: "COMPLETED", completedAt: { gte: since } },
    }),
    db.user.count(),
    db.submission.findMany({
      where: { status: { in: ["QUEUED", "PROCESSING"] } },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        reference: true,
        title: true,
        fileSize: true,
        status: true,
        similarityScore: true,
        aiScore: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
  ]);

  const oldest = awaiting[0];

  const stats = [
    { label: "Waiting in queue", value: queued, icon: ListChecks, href: "/admin/queue" },
    {
      label: "Completed (7 days)",
      value: completedWeek,
      icon: FileCheck2,
      href: "/admin/submissions?status=COMPLETED",
    },
    { label: "Registered users", value: users, icon: Users, href: "/admin/users" },
    {
      label: "Oldest waiting",
      value: oldest ? formatDate(oldest.createdAt) : "—",
      icon: Clock,
      href: "/admin/queue",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1.5 text-ink-soft">
          {queued === 0
            ? "The queue is clear."
            : `${queued} check${queued > 1 ? "s" : ""} waiting to be processed.`}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="card p-5 transition-all hover:border-ink/25 hover:shadow-soft"
          >
            <s.icon className="h-5 w-5 text-brand-600" strokeWidth={1.7} />
            <p className="mt-3 truncate text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-ink-soft">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Next in queue</h2>
            <Link
              href="/admin/queue"
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
            >
              Open queue <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {awaiting.length === 0 ? (
            <EmptyState
              icon={<ListChecks className="h-10 w-10" strokeWidth={1.3} />}
              title="Queue is empty"
              body="New uploads will appear here as soon as they arrive."
            />
          ) : (
            <div className="space-y-3">
              {awaiting.map((s) => (
                <SubmissionRow
                  key={s.id}
                  submission={s}
                  href={`/admin/submissions/${s.id}`}
                  extra={s.user.name}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <Card className="p-5">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-ink-faint">Nothing logged yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {recentLogs.map((l) => (
                  <li key={l.id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <span className="font-medium">{l.actor?.name ?? "System"}</span>{" "}
                      <span className="text-ink-soft">{l.action}</span>
                    </span>
                    <span className="shrink-0 text-xs text-ink-faint">
                      {formatDate(l.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
