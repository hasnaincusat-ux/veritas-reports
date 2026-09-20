import "server-only";
import { db } from "./db";
import { InsufficientCreditsError, grantCredits, spendCredits } from "./credits";
import { getProvider } from "./providers";
import { deleteStoredFile, saveFile } from "./storage";
import { makeAccessToken, releaseLinkCheck } from "./share-links";
import { makeReference } from "./utils";
import {
  ACCEPTED_MIME,
  CREDIT_REASON,
  FILE_RETENTION_DAYS,
  MAX_FILE_BYTES,
  DEFAULT_EXCLUSIONS,
  ORIGIN,
  SUBMISSION_STATUS,
  type Exclusions,
  type Origin,
} from "./types";

export const CREDITS_PER_CHECK = 1;

export class SubmissionError extends Error {}

export type SubmissionSource = {
  origin: Origin;
  shareLinkId?: string;
  apiKeyId?: string;
  guestName?: string;
  /** The check was already paid for (a share link reserved it) — skip the balance. */
  prepaid?: boolean;
};

export type NewSubmissionInput = {
  user: { id: string; email: string; name: string; credits: number };
  fileName: string;
  mimeType: string;
  data: Buffer;
  title?: string;
  source?: SubmissionSource;
  exclusions?: Exclusions;
};

/**
 * The whole upload pipeline, independent of the request context: validate,
 * store, charge, dispatch to the provider, and unwind cleanly on any failure.
 * The server action is a thin auth wrapper around this.
 */
export async function createSubmission(input: NewSubmissionInput) {
  const { user, fileName, mimeType, data } = input;

  if (data.byteLength === 0) throw new SubmissionError("Choose a document to upload.");
  if (data.byteLength > MAX_FILE_BYTES)
    throw new SubmissionError("That file is larger than the 100 MB limit.");
  if (!ACCEPTED_MIME[mimeType])
    throw new SubmissionError(
      "Upload a PDF, Word (.doc/.docx), PowerPoint or .txt file.",
    );
  const source: SubmissionSource = input.source ?? { origin: ORIGIN.DASHBOARD };
  if (!source.prepaid && user.credits < CREDITS_PER_CHECK)
    throw new SubmissionError(
      "You have no credits left. Ask an admin to top up your balance.",
    );

  const stored = await saveFile(`submissions/${user.id}`, fileName, data);

  // Reserve a unique human-facing reference; collisions are vanishingly rare
  // but cheap to retry.
  let reference = makeReference();
  for (let i = 0; i < 5; i++) {
    const clash = await db.submission.findUnique({
      where: { reference },
      select: { id: true },
    });
    if (!clash) break;
    reference = makeReference();
  }

  const provider = getProvider();

  const submission = await db.submission.create({
    data: {
      userId: user.id,
      reference,
      title: input.title?.trim() || fileName.replace(/\.[^.]+$/, ""),
      fileName,
      fileSize: stored.size,
      mimeType,
      storagePath: stored.key,
      status: SUBMISSION_STATUS.QUEUED,
      creditsCharged: CREDITS_PER_CHECK,
      provider: provider.id,
      purgeAfter: new Date(Date.now() + FILE_RETENTION_DAYS * 86400_000),
      origin: source.origin,
      shareLinkId: source.shareLinkId,
      apiKeyId: source.apiKeyId,
      guestName: source.guestName?.trim() || null,
      ...(input.exclusions ?? DEFAULT_EXCLUSIONS),
      // Recipients of a share link have no account, so the URL itself is the key.
      accessToken: source.origin === ORIGIN.SHARE_LINK ? makeAccessToken() : null,
    },
  });

  // Charge only after the record exists, so the ledger entry can point at it.
  // If the charge loses a race, unwind the record and the stored file.
  // A prepaid check was already taken off its share link before we got here.
  if (!source.prepaid) {
    try {
      await spendCredits(user.id, CREDITS_PER_CHECK, {
        reason: CREDIT_REASON.SUBMISSION_CHARGE,
        note: `Check ${reference}`,
        submissionId: submission.id,
      });
    } catch (err) {
      await db.submission.delete({ where: { id: submission.id } });
      await deleteStoredFile(stored.key);
      if (err instanceof InsufficientCreditsError)
        throw new SubmissionError(
          "You have no credits left. Ask an admin to top up your balance.",
        );
      throw err;
    }
  }

  try {
    const result = await provider.submit({
      submissionId: submission.id,
      reference,
      title: submission.title,
      fileName: submission.fileName,
      mimeType: submission.mimeType,
      storageKey: submission.storagePath,
      user: { id: user.id, email: user.email, name: user.name },
    });

    await db.$transaction([
      db.submission.update({
        where: { id: submission.id },
        data: { status: result.status, providerRef: result.providerRef },
      }),
      db.submissionEvent.create({
        data: {
          submissionId: submission.id,
          status: result.status,
          message: result.message,
        },
      }),
    ]);
  } catch (err) {
    // The provider rejected it — give the check back wherever it came from.
    if (source.prepaid && source.shareLinkId) {
      await releaseLinkCheck(source.shareLinkId);
    } else {
      await grantCredits(user.id, CREDITS_PER_CHECK, {
        reason: CREDIT_REASON.REFUND,
        note: `Automatic refund for ${reference}`,
        submissionId: submission.id,
      });
    }
    await db.submission.update({
      where: { id: submission.id },
      data: {
        status: SUBMISSION_STATUS.FAILED,
        failureReason:
          err instanceof Error ? err.message : "The document could not be submitted.",
      },
    });
    throw new SubmissionError(
      "We could not start that check. Your credit has been refunded.",
    );
  }

  return submission;
}
