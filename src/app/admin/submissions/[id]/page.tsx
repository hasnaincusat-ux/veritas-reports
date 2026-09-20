import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Mail } from "lucide-react";
import { Alert, Button, Card } from "@/components/ui";
import { ExclusionSummary, ScoreDial, StatusBadge } from "@/components/app/submission";
import { CompleteForm, FailForm } from "@/components/admin/SubmissionWorkbench";
import { startProcessingAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBytes, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const submission = await db.submission.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, credits: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!submission) notFound();

  const closed = submission.status === "CANCELLED" || submission.status === "FAILED";
  const purged = submission.purgeAfter
    ? submission.purgeAfter.getTime() < Date.now()
    : false;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/queue"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to queue
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {submission.title}
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            {submission.reference} · {formatDate(submission.createdAt, true)} · provider:{" "}
            {submission.provider}
          </p>
        </div>
        <StatusBadge status={submission.status} />
      </header>

      {/* ------------------------------------------------------ the customer */}
      <Card className="space-y-4 p-6">
        <h2 className="font-semibold">Customer</h2>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <Link
            href={`/admin/users/${submission.user.id}`}
            className="font-medium text-brand-600 hover:underline"
          >
            {submission.user.name}
          </Link>
          <a
            href={`mailto:${submission.user.email}`}
            className="flex items-center gap-1.5 text-ink-soft hover:text-ink"
          >
            <Mail className="h-3.5 w-3.5" />
            {submission.user.email}
          </a>
          {submission.user.phone ? (
            <span className="text-ink-soft">{submission.user.phone}</span>
          ) : null}
          <span className="text-ink-soft">{submission.user.credits} credit(s) left</span>
        </div>
      </Card>

      {/* --------------------------------------------------------- the file */}
      <Card className="space-y-4 p-6">
        <h2 className="font-semibold">Uploaded document</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{submission.fileName}</p>
            <p className="text-xs text-ink-faint">
              {formatBytes(submission.fileSize)} · {submission.mimeType}
              {submission.purgeAfter
                ? ` · ${purged ? "purged" : `deletes ${formatDate(submission.purgeAfter)}`}`
                : null}
            </p>
          </div>
          {purged ? (
            <span className="text-sm text-ink-faint">
              File removed by retention policy
            </span>
          ) : (
            <a
              href={`/api/submissions/${submission.id}/download/source`}
              className="inline-flex items-center gap-2 rounded-pill border border-ink/20 bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:border-ink/40"
            >
              <Download className="h-4 w-4" />
              Download original
            </a>
          )}
        </div>
        <div className="rounded-xl2 border-l-4 border-amber-400/50 bg-amber-400/10 p-4">
          <ExclusionSummary exclusions={submission} />
          <p className="mt-2.5 text-xs leading-relaxed text-amber-200">
            Set these exclusions in Turnitin before generating the report — the customer
            chose them and the score is read against them.
          </p>
        </div>

        <p className="text-xs leading-relaxed text-ink-faint">
          Run this document through your Turnitin account, then attach the resulting PDFs
          below to release them to the customer.
        </p>
      </Card>

      {/* ----------------------------------------------------- current state */}
      {submission.status === "COMPLETED" ? (
        <Card className="p-7">
          <div className="grid gap-8 sm:grid-cols-2">
            <ScoreDial
              metric="similarity"
              value={submission.similarityScore}
              size={112}
            />
            <ScoreDial metric="ai" value={submission.aiScore} size={112} />
          </div>
        </Card>
      ) : null}

      {submission.status === "FAILED" && submission.failureReason ? (
        <Alert tone="error">
          <span className="font-semibold">Marked failed:</span> {submission.failureReason}
        </Alert>
      ) : null}

      {submission.status === "CANCELLED" ? (
        <Alert tone="info">The customer cancelled this check and was refunded.</Alert>
      ) : null}

      {/* ------------------------------------------------------------ actions */}
      {submission.status === "QUEUED" ? (
        <form action={startProcessingAction.bind(null, submission.id)}>
          <Button type="submit">Mark as processing</Button>
        </form>
      ) : null}

      {!closed ? (
        <Card className="space-y-5 p-7">
          <div>
            <h2 className="font-semibold">
              {submission.status === "COMPLETED"
                ? "Update reports"
                : "Complete this check"}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Enter the scores and attach the report PDFs. Publishing makes them
              downloadable for the customer immediately.
            </p>
          </div>

          <CompleteForm
            submissionId={submission.id}
            defaults={{
              similarityScore: submission.similarityScore,
              aiScore: submission.aiScore,
              wordCount: submission.wordCount,
              pageCount: submission.pageCount,
              adminNote: submission.adminNote,
              hasSimilarityReport: Boolean(submission.similarityReportPath),
            }}
          />

          <div className="border-t border-ink/10 pt-5">
            <FailForm submissionId={submission.id} />
          </div>
        </Card>
      ) : null}

      {/* ----------------------------------------------------------- history */}
      <Card className="space-y-4 p-6">
        <h2 className="font-semibold">History</h2>
        {submission.events.length === 0 ? (
          <p className="text-sm text-ink-faint">No events yet.</p>
        ) : (
          <ul className="space-y-3 border-l border-ink/10 pl-5 text-sm">
            {submission.events.map((e) => (
              <li key={e.id} className="relative">
                <span
                  className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-600 ring-4 ring-white"
                  aria-hidden
                />
                <p>{e.message}</p>
                <p className="text-xs text-ink-faint">{formatDate(e.createdAt, true)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
