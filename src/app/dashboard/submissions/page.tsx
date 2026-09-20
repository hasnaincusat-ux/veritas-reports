import type { Metadata } from "next";
import { UploadCloud } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { DocumentsTable } from "@/components/app/DocumentsTable";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "My documents" };
export const dynamic = "force-dynamic";

/** The full archive — same table as the dashboard, without the side rail. */
export default async function SubmissionsPage() {
  const user = await requireUser();

  const documents = await db.submission.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
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
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Archive</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            My documents
          </h1>
          <p className="mt-1.5 text-ink-soft">
            Every check you have run, searchable and sortable.
          </p>
        </div>
        <ButtonLink href="/dashboard#new-check" size="sm">
          <UploadCloud className="h-4 w-4" />
          New check
        </ButtonLink>
      </header>

      <DocumentsTable
        docs={documents}
        hrefBase="/dashboard/submissions"
        emptyAction={
          <ButtonLink href="/dashboard#new-check" size="sm">
            Upload a document
          </ButtonLink>
        }
      />
    </div>
  );
}
