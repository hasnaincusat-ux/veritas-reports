import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./db";

export class ApiKeyError extends Error {}

const KEY_PREFIX = "vr_live_";

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Returns the plaintext key exactly once. Only its hash is stored, so a
 * database leak does not hand out working credentials.
 */
export async function generateApiKey(ownerId: string, label: string) {
  const clean = label.trim();
  if (clean.length < 1)
    throw new ApiKeyError("Give the key a label so you can tell them apart.");

  const active = await db.apiKey.count({ where: { ownerId, status: "ACTIVE" } });
  if (active >= 10)
    throw new ApiKeyError("You already have 10 active keys. Revoke one first.");

  const secret = randomBytes(24).toString("base64url");
  const key = `${KEY_PREFIX}${secret}`;

  const record = await db.apiKey.create({
    data: {
      ownerId,
      label: clean,
      prefix: `${KEY_PREFIX}${secret.slice(0, 4)}`,
      hash: hashKey(key),
    },
  });

  return { key, record };
}

export async function revokeApiKey(ownerId: string, keyId: string) {
  const updated = await db.apiKey.updateMany({
    where: { id: keyId, ownerId, status: "ACTIVE" },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  if (updated.count !== 1) throw new ApiKeyError("Key not found or already revoked.");
}

export async function setWebhook(ownerId: string, keyId: string, url: string | null) {
  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new ApiKeyError("Enter a full URL, including https://");
    }
    if (parsed.protocol !== "https:" && process.env.NODE_ENV === "production")
      throw new ApiKeyError("Webhook URLs must use https.");
  }
  const updated = await db.apiKey.updateMany({
    where: { id: keyId, ownerId, status: "ACTIVE" },
    data: { webhookUrl: url },
  });
  if (updated.count !== 1) throw new ApiKeyError("Key not found or revoked.");
}

/**
 * Resolve a Bearer token to its owner. Constant-time compare on the hash so a
 * near-miss key does not leak timing information; then require the owner to
 * still have the feature switched on.
 */
export async function authenticateApiKey(authorization: string | null) {
  const raw = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!raw || !raw.startsWith(KEY_PREFIX)) return null;

  const candidate = hashKey(raw);
  const record = await db.apiKey.findUnique({
    where: { hash: candidate },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
          credits: true,
          status: true,
          featureApi: true,
        },
      },
    },
  });
  if (!record || record.status !== "ACTIVE") return null;

  const a = Buffer.from(record.hash, "hex");
  const b = Buffer.from(candidate, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  if (record.owner.status !== "ACTIVE" || !record.owner.featureApi) return null;

  // Fire-and-forget: usage bookkeeping should never slow the request down.
  void db.apiKey
    .update({
      where: { id: record.id },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
    })
    .catch(() => {});

  return record;
}

/**
 * Tell the integrator a check finished. One attempt with a short timeout; the
 * status endpoint is always there as the fallback, so we do not build a retry
 * queue for this.
 */
export async function dispatchWebhook(submissionId: string) {
  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      reference: true,
      status: true,
      similarityScore: true,
      aiScore: true,
      completedAt: true,
      failureReason: true,
      apiKey: { select: { webhookUrl: true, status: true } },
    },
  });
  const url = submission?.apiKey?.webhookUrl;
  if (!submission || !url || submission.apiKey?.status !== "ACTIVE") return;

  const body = JSON.stringify({
    event: submission.status === "COMPLETED" ? "check.completed" : "check.failed",
    check_id: submission.id,
    reference: submission.reference,
    status: submission.status.toLowerCase(),
    similarity_score: submission.similarityScore,
    ai_score: submission.aiScore,
    failure_reason: submission.failureReason,
    completed_at: submission.completedAt?.toISOString() ?? null,
  });

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "VeritasReports-Webhook/1",
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* integrator's problem to poll; logged nowhere on purpose to avoid noise */
  }
}
