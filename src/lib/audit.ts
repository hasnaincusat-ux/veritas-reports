import "server-only";
import { db } from "./db";

export async function audit(
  actorId: string | null,
  action: string,
  target?: { type?: string; id?: string; meta?: unknown },
) {
  await db.auditLog.create({
    data: {
      actorId,
      action,
      targetType: target?.type,
      targetId: target?.id,
      meta: target?.meta ? JSON.stringify(target.meta) : undefined,
    },
  });
}
