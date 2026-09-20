"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import {
  cancelShareLink,
  consumeLinkCheck,
  createShareLink,
  releaseLinkCheck,
  ShareLinkError,
} from "@/lib/share-links";
import { createSubmission, SubmissionError } from "@/lib/submissions";
import { ACCEPTED_MIME, MAX_FILE_BYTES, ORIGIN, parseExclusions } from "@/lib/types";

export type LinkState = { error?: string; success?: string } | null;

async function requireLinksFeature() {
  const user = await getCurrentUser();
  if (!user) return null;
  const flags = await db.user.findUnique({
    where: { id: user.id },
    select: { featureShareLinks: true },
  });
  return flags?.featureShareLinks ? user : null;
}

export async function createShareLinkAction(
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const user = await requireLinksFeature();
  if (!user) return { error: "Share links are not enabled on your account." };

  try {
    const link = await createShareLink(user.id, {
      label: String(formData.get("label") ?? ""),
      allocated: Number(formData.get("allocated")),
    });
    await audit(user.id, "sharelink.create", {
      type: "ShareLink",
      id: link.id,
      meta: { allocated: link.allocated },
    });
  } catch (err) {
    if (err instanceof ShareLinkError) return { error: err.message };
    throw err;
  }

  revalidatePath("/dashboard/links");
  revalidatePath("/dashboard");
  return { success: "Link created." };
}

export async function cancelShareLinkAction(linkId: string) {
  const user = await requireLinksFeature();
  if (!user) throw new Error("FORBIDDEN");

  const returned = await cancelShareLink(user.id, linkId);
  await audit(user.id, "sharelink.cancel", {
    type: "ShareLink",
    id: linkId,
    meta: { returned },
  });

  revalidatePath("/dashboard/links");
  revalidatePath("/dashboard");
}

export async function updatePartnerNameAction(
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const user = await requireLinksFeature();
  if (!user) return { error: "Share links are not enabled on your account." };

  const name = String(formData.get("partnerName") ?? "")
    .trim()
    .slice(0, 60);
  await db.user.update({ where: { id: user.id }, data: { partnerName: name || null } });

  revalidatePath("/dashboard/links");
  return { success: "Display name saved." };
}

/* ------------------------------------------------------------ recipient */

export type GuestUploadState = { error?: string } | null;

/**
 * Upload from a share link. No sign-in: the link is the credential. One check
 * is claimed off the link before the file is touched, and handed back if the
 * pipeline rejects the upload.
 */
export async function guestUploadAction(
  code: string,
  _prev: GuestUploadState,
  formData: FormData,
): Promise<GuestUploadState> {
  const link = await db.shareLink.findUnique({
    where: { code },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
          credits: true,
          status: true,
          featureShareLinks: true,
        },
      },
    },
  });

  if (
    !link ||
    link.status !== "ACTIVE" ||
    link.owner.status !== "ACTIVE" ||
    !link.owner.featureShareLinks
  )
    return { error: "This link is no longer active." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: "Choose a document to upload." };
  if (file.size > MAX_FILE_BYTES)
    return { error: "That file is larger than the 100 MB limit." };
  if (!ACCEPTED_MIME[file.type])
    return { error: "Upload a PDF, Word (.doc/.docx), PowerPoint or .txt file." };

  try {
    await consumeLinkCheck(link.id);
  } catch (err) {
    if (err instanceof ShareLinkError) return { error: err.message };
    throw err;
  }

  let submissionId: string;
  let token: string;
  try {
    const submission = await createSubmission({
      user: link.owner,
      fileName: file.name,
      mimeType: file.type,
      data: Buffer.from(await file.arrayBuffer()),
      title: String(formData.get("title") ?? ""),
      exclusions: parseExclusions((k) => formData.get(k)),
      source: {
        origin: ORIGIN.SHARE_LINK,
        shareLinkId: link.id,
        guestName: String(formData.get("guestName") ?? ""),
        prepaid: true,
      },
    });
    submissionId = submission.id;
    token = submission.accessToken!;
  } catch (err) {
    await releaseLinkCheck(link.id);
    if (err instanceof SubmissionError) return { error: err.message };
    throw err;
  }

  revalidatePath("/dashboard/links");
  redirect(`/c/${code}/${submissionId}?t=${token}`);
}
