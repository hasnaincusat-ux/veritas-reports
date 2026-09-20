import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { Bookmark, Download, FileText, Sparkles } from "lucide-react";
import { Alert, Card } from "@/components/ui";
import { LiveProgress } from "@/components/app/LiveProgress";
import { ExclusionSummary, ScoreDial, StatusBadge } from "@/components/app/submission";
import { db } from "@/lib/db";
import { STATUS_META, type SubmissionStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Your result" };
export const dynamic = "force-dynamic";

/**
 * A share-link recipient's result page. The `t` query parameter is the only
 * credential; without a matching token the page does not exist.
 */
export default async function GuestResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string; id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { code, id } = await params;
  const { t } = await searchParams;

  const submission = await db.submission.findUnique({
    where: { id },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      shareLink: {
        select: { code: true, owner: { select: { name: true, partnerName: true } } },
      },
    },
  });

  if (!submission || !submission.accessToken || !t || submission.shareLink?.code !== code)
    notFound();
  const a = Buffer.from(t);
  const b = Buffer.from(submission.accessToken);
  if (a.length !== b.length || !timingSafeEqual(a, b)) notFound();

  const from =
    submission.shareLink?.owner.partnerName || submission.shareLink?.owner.name;
  const done = submission.status === "COMPLETED";
  const meta = STATUS_META[submission.status as SubmissionStatus];
  const dl = (kind: string) =>
    `/api/submissions/${submission.id}/download/${kind}?t=${encodeURIComponent(t)}`;

  return (
    <main className="min-h-screen bg-cream px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Shared by {from}</p>
            <h1 className="mt-1 truncate font-display text-3xl font-semibold tracking-tight">
              {submission.title}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {submission.reference} · {formatDate(submission.createdAt, true)}
              {submission.guestName ? ` · for ${submission.guestName}` : ""}
            </p>
          </div>
          <StatusBadge status={submission.status} />
        </header>

        <Alert tone="warning">
          <span className="inline-flex items-center gap-2 font-bold">
            <Bookmark className="h-3.5 w-3.5" /> Bookmark this page.
          </span>{" "}
          It is the only way back to this result — there is no account to sign in to.
        </Alert>

        {submission.status === "FAILED" && submission.failureReason ? (
          <Alert tone="error">
            <span className="font-semibold">This check failed.</span>{" "}
            {submission.failureReason}
          </Alert>
        ) : null}

        {done ? (
          <Card className="space-y-8 p-7">
            <div className="grid gap-8 sm:grid-cols-2">
              <ScoreDial metric="similarity" value={submission.similarityScore} />
              <ScoreDial metric="ai" value={submission.aiScore} />
            </div>
            <div className="grid gap-3 border-t border-ink/10 pt-6 sm:grid-cols-2">
              <a
                href={dl("similarity")}
                className="flex items-center gap-3 rounded-xl2 border border-ink/15 bg-surface p-4 hover:border-brand-600"
              >
                <FileText className="h-5 w-5 shrink-0 text-brand-600" strokeWidth={1.7} />
                <span className="flex-1 text-sm font-medium">Similarity report</span>
                <Download className="h-4 w-4 text-ink-faint" />
              </a>
              {submission.aiReportPath ? (
                <a
                  href={dl("ai")}
                  className="flex items-center gap-3 rounded-xl2 border border-ink/15 bg-surface p-4 hover:border-brand-600"
                >
                  <Sparkles
                    className="h-5 w-5 shrink-0 text-brand-600"
                    strokeWidth={1.7}
                  />
                  <span className="flex-1 text-sm font-medium">AI writing report</span>
                  <Download className="h-4 w-4 text-ink-faint" />
                </a>
              ) : null}
            </div>
            <ExclusionSummary exclusions={submission} tone="panel" />

            {submission.adminNote ? (
              <div className="rounded-xl2 bg-cream p-4 text-sm text-ink-soft">
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
            token={t}
            initialEvents={submission.events.map((e) => ({
              status: e.status,
              message: e.message,
              createdAt: e.createdAt.toISOString(),
            }))}
          />
        </Card>
      </div>
    </main>
  );
}
