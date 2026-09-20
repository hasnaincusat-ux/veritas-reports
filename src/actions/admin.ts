"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { grantCredits, revokeCredits } from "@/lib/credits";
import { saveFile } from "@/lib/storage";
import { dispatchWebhook } from "@/lib/api-keys";
import { CREDIT_REASON, FEATURES, SUBMISSION_STATUS, type FeatureId } from "@/lib/types";

export type AdminState = { error?: string; success?: string } | null;

function refreshSubmission(id: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/queue");
  revalidatePath(`/admin/submissions/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/submissions");
}

/** Move a queued job to PROCESSING so the user sees it has been picked up. */
export async function startProcessingAction(submissionId: string) {
  const admin = await requireAdmin();

  const submission = await db.submission.findUniqueOrThrow({
    where: { id: submissionId },
    select: { id: true, status: true },
  });
  if (submission.status !== SUBMISSION_STATUS.QUEUED)
    throw new Error("Only queued submissions can be started.");

  await db.$transaction([
    db.submission.update({
      where: { id: submissionId },
      data: { status: SUBMISSION_STATUS.PROCESSING, startedAt: new Date() },
    }),
    db.submissionEvent.create({
      data: {
        submissionId,
        status: SUBMISSION_STATUS.PROCESSING,
        message: "Your document is being analysed.",
      },
    }),
  ]);

  await audit(admin.id, "submission.start", { type: "Submission", id: submissionId });
  refreshSubmission(submissionId);
}

const PDF_MIME = "application/pdf";

/** Attach the finished reports and release them to the user. */
export async function completeSubmissionAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const admin = await requireAdmin();
  const submissionId = String(formData.get("submissionId") ?? "");

  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      userId: true,
      status: true,
      reference: true,
      similarityReportPath: true,
      aiReportPath: true,
    },
  });
  if (!submission) return { error: "Submission not found." };
  if (
    submission.status === SUBMISSION_STATUS.CANCELLED ||
    submission.status === SUBMISSION_STATUS.FAILED
  )
    return { error: "This submission is closed and cannot be completed." };

  const similarity = Number(formData.get("similarityScore"));
  const ai = Number(formData.get("aiScore"));
  const inRange = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100;
  if (!inRange(similarity))
    return { error: "Similarity score must be between 0 and 100." };
  if (!inRange(ai)) return { error: "AI score must be between 0 and 100." };

  const simFile = formData.get("similarityReport");
  const aiFile = formData.get("aiReport");

  let similarityPath = submission.similarityReportPath;
  let aiPath = submission.aiReportPath;

  if (simFile instanceof File && simFile.size > 0) {
    if (simFile.type !== PDF_MIME)
      return { error: "The similarity report must be a PDF." };
    similarityPath = (
      await saveFile(
        `reports/${submission.userId}`,
        `${submission.reference}-similarity.pdf`,
        Buffer.from(await simFile.arrayBuffer()),
      )
    ).key;
  }
  if (aiFile instanceof File && aiFile.size > 0) {
    if (aiFile.type !== PDF_MIME) return { error: "The AI report must be a PDF." };
    aiPath = (
      await saveFile(
        `reports/${submission.userId}`,
        `${submission.reference}-ai.pdf`,
        Buffer.from(await aiFile.arrayBuffer()),
      )
    ).key;
  }

  if (!similarityPath)
    return { error: "Attach the similarity report PDF before completing." };

  const wordCount = Number(formData.get("wordCount"));
  const pageCount = Number(formData.get("pageCount"));

  await db.$transaction([
    db.submission.update({
      where: { id: submissionId },
      data: {
        status: SUBMISSION_STATUS.COMPLETED,
        similarityScore: similarity,
        aiScore: ai,
        wordCount: Number.isFinite(wordCount) && wordCount > 0 ? wordCount : null,
        pageCount: Number.isFinite(pageCount) && pageCount > 0 ? pageCount : null,
        similarityReportPath: similarityPath,
        aiReportPath: aiPath,
        adminNote: String(formData.get("adminNote") ?? "").trim() || null,
        completedAt: new Date(),
        failureReason: null,
      },
    }),
    db.submissionEvent.create({
      data: {
        submissionId,
        status: SUBMISSION_STATUS.COMPLETED,
        message: "Your reports are ready to download.",
      },
    }),
  ]);

  await audit(admin.id, "submission.complete", {
    type: "Submission",
    id: submissionId,
    meta: { similarity, ai },
  });
  // Integrators who registered a webhook hear about it without polling.
  void dispatchWebhook(submissionId);
  refreshSubmission(submissionId);
  return { success: "Reports published to the user." };
}

/** Mark a job failed and refund the credit in the same breath. */
export async function failSubmissionAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const admin = await requireAdmin();
  const submissionId = String(formData.get("submissionId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Give the user a reason." };

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
  if (!submission) return { error: "Submission not found." };
  if (
    submission.status === SUBMISSION_STATUS.FAILED ||
    submission.status === SUBMISSION_STATUS.CANCELLED
  )
    return { error: "This submission is already closed." };

  await db.$transaction([
    db.submission.update({
      where: { id: submissionId },
      data: {
        status: SUBMISSION_STATUS.FAILED,
        failureReason: reason,
        completedAt: new Date(),
      },
    }),
    db.submissionEvent.create({
      data: { submissionId, status: SUBMISSION_STATUS.FAILED, message: reason },
    }),
  ]);

  await grantCredits(submission.userId, submission.creditsCharged, {
    reason: CREDIT_REASON.REFUND,
    note: `Refund for ${submission.reference}`,
    actorId: admin.id,
    submissionId,
  });

  await audit(admin.id, "submission.fail", {
    type: "Submission",
    id: submissionId,
    meta: { reason },
  });
  void dispatchWebhook(submissionId);
  refreshSubmission(submissionId);
  return { success: "Marked failed and the credit was refunded." };
}

/* ------------------------------------------------------------------ users */

export async function adjustCreditsAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const amount = Number(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const direction = String(formData.get("direction") ?? "grant");

  if (!Number.isInteger(amount) || amount <= 0)
    return { error: "Enter a whole number greater than zero." };

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!target) return { error: "User not found." };

  if (direction === "revoke") {
    await revokeCredits(userId, amount, { note, actorId: admin.id });
  } else {
    await grantCredits(userId, amount, {
      reason: CREDIT_REASON.ADMIN_GRANT,
      note,
      actorId: admin.id,
    });
  }

  await audit(admin.id, `user.credits_${direction}`, {
    type: "User",
    id: userId,
    meta: { amount },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return {
    success: `${direction === "revoke" ? "Removed" : "Added"} ${amount} credit(s).`,
  };
}

export async function setUserStatusAction(
  userId: string,
  status: "ACTIVE" | "SUSPENDED",
) {
  const admin = await requireAdmin();
  if (userId === admin.id) throw new Error("You cannot suspend your own account.");

  await db.user.update({ where: { id: userId }, data: { status } });
  await audit(admin.id, "user.status", { type: "User", id: userId, meta: { status } });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function setUserRoleAction(userId: string, role: "USER" | "ADMIN") {
  const admin = await requireAdmin();
  if (userId === admin.id) throw new Error("You cannot change your own role.");

  await db.user.update({ where: { id: userId }, data: { role } });
  await audit(admin.id, "user.role", { type: "User", id: userId, meta: { role } });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

/** Switch a per-customer feature (share links, API) on or off. */
export async function setUserFeatureAction(
  userId: string,
  feature: FeatureId,
  enabled: boolean,
) {
  const admin = await requireAdmin();
  const column = FEATURES[feature].key;

  await db.user.update({ where: { id: userId }, data: { [column]: enabled } });
  await audit(admin.id, "user.feature", {
    type: "User",
    id: userId,
    meta: { feature, enabled },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/dashboard");
}

/* -------------------------------------------------------- reviews/messages */

export async function setReviewStatusAction(
  reviewId: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
) {
  const admin = await requireAdmin();
  await db.review.update({ where: { id: reviewId }, data: { status } });
  await audit(admin.id, "review.moderate", {
    type: "Review",
    id: reviewId,
    meta: { status },
  });
  revalidatePath("/admin/reviews");
  revalidatePath("/");
}

export async function setMessageStatusAction(
  messageId: string,
  status: "NEW" | "READ" | "ARCHIVED",
) {
  await requireAdmin();
  await db.contactMessage.update({ where: { id: messageId }, data: { status } });
  revalidatePath("/admin/messages");
}
