import type { Metadata } from "next";
import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { SubmissionRow } from "@/components/app/submission";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Queue" };
export const dynamic = "force-dynamic";

export default async function QueuePage() {
  await requireAdmin();

  // Oldest first — the queue is worked front to back.
  const queue = await db.submission.findMany({
    where: { status: { in: ["QUEUED", "PROCESSING"] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      reference: true,
      title: true,
      fileSize: true,
      status: true,
      similarityScore: true,
      aiScore: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Queue</h1>
        <p className="mt-1.5 text-ink-soft">
          {queue.length === 0
            ? "Nothing waiting. Everything is processed."
            : `${queue.length} check${queue.length > 1 ? "s" : ""} to work through, oldest first.`}
        </p>
      </header>

      {queue.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-10 w-10" strokeWidth={1.3} />}
          title="Queue is clear"
          body="New uploads land here the moment a customer submits one."
        />
      ) : (
        <div className="space-y-3">
          {queue.map((s) => (
            <SubmissionRow
              key={s.id}
              submission={s}
              href={`/admin/submissions/${s.id}`}
              extra={s.user.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
