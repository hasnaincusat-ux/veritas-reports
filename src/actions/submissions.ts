"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { grantCredits } from "@/lib/credits";
import { createSubmission, SubmissionError } from "@/lib/submissions";
import {
  ACCEPTED_MIME,
  CREDIT_REASON,
  MAX_FILE_BYTES,
  SUBMISSION_STATUS,
  parseExclusions,
} from "@/lib/types";

export type UploadState = { error?: string } | null;

export async function createSubmissionAction(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to upload a document." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: "Choose a document to upload." };

  // Cheap checks before pulling the whole file into memory.
  if (file.size > MAX_FILE_BYTES)
    return { error: "That file is larger than the 100 MB limit." };
  if (!ACCEPTED_MIME[file.type])
    return { error: "Upload a PDF, Word (.doc/.docx), PowerPoint or .txt file." };

  let submissionId: string;
  try {
    const submission = await createSubmission({
      user,
      fileName: file.name,
      mimeType: file.type,
      data: Buffer.from(await file.arrayBuffer()),
      title: String(formData.get("title") ?? ""),
      exclusions: parseExclusions((k) => formData.get(k)),
    });
    submissionId = submission.id;

    await audit(user.id, "submission.create", {
      type: "Submission",
      id: submission.id,
      meta: { reference: submission.reference },
    });
  } catch (err) {
    if (err instanceof SubmissionError) return { error: err.message };
    throw err;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/submissions");

  // Land the user straight on the live progress page for this check.
  redirect(`/dashboard/submissions/${submissionId}`);
}

export async function cancelSubmissionAction(submissionId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      userId: true,
      status: true,
      creditsCharged: true,
      reference: true,
    },
  });
  if (!submission || submission.userId !== user.id) throw new Error("NOT_FOUND");
  if (submission.status !== SUBMISSION_STATUS.QUEUED)
    throw new Error("Only queued submissions can be cancelled.");

  await db.$transaction([
    db.submission.update({
      where: { id: submission.id },
      data: { status: SUBMISSION_STATUS.CANCELLED, completedAt: new Date() },
    }),
    db.submissionEvent.create({
      data: {
        submissionId: submission.id,
        status: SUBMISSION_STATUS.CANCELLED,
        message: "Cancelled by you. Your credit was refunded.",
      },
    }),
  ]);

  await grantCredits(user.id, submission.creditsCharged, {
    reason: CREDIT_REASON.REFUND,
    note: `Cancelled ${submission.reference}`,
    submissionId: submission.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/submissions");
}
