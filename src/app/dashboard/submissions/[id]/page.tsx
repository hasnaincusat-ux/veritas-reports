import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, Sparkles } from "lucide-react";
import { Alert, Button, Card } from "@/components/ui";
import { LiveProgress } from "@/components/app/LiveProgress";
import { ExclusionSummary, ScoreDial, StatusBadge } from "@/components/app/submission";
import { cancelSubmissionAction } from "@/actions/submissions";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { STATUS_META, type SubmissionStatus } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Report" };
export const dynamic = "force-dynamic";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const submission = await db.submission.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });

  // A stranger's id looks exactly like a missing one, so nothing leaks.
  if (!submission || submission.userId !== user.id) notFound();

  const meta = STATUS_META[submission.status as SubmissionStatus];
  const done = submission.status === "COMPLETED";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/submissions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All reports
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {submission.title}
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            {submission.reference} · {submission.fileName} ·{" "}
            {formatBytes(submission.fileSize)} · {formatDate(submission.createdAt, true)}
          </p>
        </div>
        <StatusBadge status={submission.status} />
      </header>

      {submission.status === "FAILED" && submission.failureReason ? (
        <Alert tone="error">
          <span className="font-semibold">This check failed.</span>{" "}
          {submission.failureReason} Your credit has been refunded.
        </Alert>
      ) : null}

      {done ? (
        <Card className="space-y-8 p-7">
          <div className="grid gap-8 sm:grid-cols-2">
            <ScoreDial metric="similarity" value={submission.similarityScore} />
            <ScoreDial metric="ai" value={submission.aiScore} />
          </div>

          {submission.wordCount || submission.pageCount ? (
            <dl className="flex justify-center gap-10 border-t border-ink/10 pt-6 text-center">
              {submission.wordCount ? (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-ink-faint">
                    Words
                  </dt>
                  <dd className="text-xl font-semibold">
                    {submission.wordCount.toLocaleString()}
                  </dd>
                </div>
              ) : null}
              {submission.pageCount ? (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-ink-faint">
                    Pages
                  </dt>
                  <dd className="text-xl font-semibold">{submission.pageCount}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          <div className="grid gap-3 border-t border-ink/10 pt-6 sm:grid-cols-2">
            <a
              href={`/api/submissions/${submission.id}/download/similarity`}
              className="flex items-center gap-3 rounded-xl2 border border-ink/15 bg-surface p-4 transition-colors hover:border-brand-600"
            >
              <FileText className="h-5 w-5 shrink-0 text-brand-600" strokeWidth={1.7} />
              <span className="flex-1 text-sm font-medium">Similarity report</span>
              <Download className="h-4 w-4 text-ink-faint" />
            </a>

            {submission.aiReportPath ? (
              <a
                href={`/api/submissions/${submission.id}/download/ai`}
                className="flex items-center gap-3 rounded-xl2 border border-ink/15 bg-surface p-4 transition-colors hover:border-brand-600"
              >
                <Sparkles className="h-5 w-5 shrink-0 text-brand-600" strokeWidth={1.7} />
                <span className="flex-1 text-sm font-medium">AI writing report</span>
                <Download className="h-4 w-4 text-ink-faint" />
              </a>
            ) : (
              <div className="flex items-center gap-3 rounded-xl2 border border-dashed border-ink/15 p-4 text-sm text-ink-faint">
                No separate AI report for this check
              </div>
            )}
          </div>

          <ExclusionSummary exclusions={submission} tone="panel" />

          {submission.adminNote ? (
            <div className="rounded-xl2 bg-cream p-4 text-sm leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">Note: </span>
              {submission.adminNote}
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className="space-y-5 p-7">
        <div>
          <h2 className="font-semibold">Progress</h2>
          <p className="mt-1 text-sm text-ink-soft">{meta?.blurb}</p>
        </div>

        <LiveProgress
          submissionId={submission.id}
          initialStatus={submission.status}
          initialEvents={submission.events.map((e) => ({
            status: e.status,
            message: e.message,
            createdAt: e.createdAt.toISOString(),
          }))}
        />
      </Card>

      {submission.status === "QUEUED" ? (
        <form action={cancelSubmissionAction.bind(null, submission.id)}>
          <Button type="submit" variant="ghost" size="sm">
            Cancel this check and refund my credit
          </Button>
        </form>
      ) : null}
    </div>
  );
}
