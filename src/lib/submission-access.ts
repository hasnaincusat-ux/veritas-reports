import "server-only";
import { timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { authenticateApiKey } from "./api-keys";
import { ROLE } from "./types";

export type Access =
  | { kind: "owner" | "admin"; userId: string }
  | { kind: "guest" }
  | { kind: "api"; userId: string }
  | null;

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * One answer to "may this request see this submission?" for every route.
 * Three doors: a signed-in owner or admin, a share-link recipient holding the
 * submission's access token, or an API key whose owner owns the submission.
 */
export async function resolveAccess(
  submissionId: string,
  req: Request,
): Promise<{ access: Access; ownerId: string | null }> {
  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    select: { userId: true, accessToken: true },
  });
  if (!submission) return { access: null, ownerId: null };

  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  if (token && submission.accessToken && safeEqual(token, submission.accessToken))
    return { access: { kind: "guest" }, ownerId: submission.userId };

  const key = await authenticateApiKey(req.headers.get("authorization"));
  if (key) {
    return key.ownerId === submission.userId
      ? { access: { kind: "api", userId: key.ownerId }, ownerId: submission.userId }
      : { access: null, ownerId: submission.userId };
  }

  const user = await getCurrentUser();
  if (!user) return { access: null, ownerId: submission.userId };
  if (user.role === ROLE.ADMIN)
    return { access: { kind: "admin", userId: user.id }, ownerId: submission.userId };
  if (user.id === submission.userId)
    return { access: { kind: "owner", userId: user.id }, ownerId: submission.userId };

  return { access: null, ownerId: submission.userId };
}
