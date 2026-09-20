import "server-only";
import { db } from "./db";
import { CREDIT_REASON, type CreditReason } from "./types";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Not enough credits.");
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Spend credits atomically. The conditional updateMany is the guard: if two
 * requests race, only one can match `credits >= amount` and the loser throws
 * rather than driving the balance negative.
 */
export async function spendCredits(
  userId: string,
  amount: number,
  opts: { reason?: CreditReason; note?: string; submissionId?: string } = {},
) {
  if (amount <= 0) throw new Error("Amount must be positive.");

  return db.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: userId, credits: { gte: amount } },
      data: { credits: { decrement: amount } },
    });
    if (updated.count !== 1) throw new InsufficientCreditsError();

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { credits: true },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        delta: -amount,
        balanceAfter: user.credits,
        reason: opts.reason ?? CREDIT_REASON.SUBMISSION_CHARGE,
        note: opts.note,
        submissionId: opts.submissionId,
      },
    });

    return user.credits;
  });
}

/** Add credits — admin grants, refunds and the signup bonus all land here. */
export async function grantCredits(
  userId: string,
  amount: number,
  opts: {
    reason?: CreditReason;
    note?: string;
    actorId?: string;
    submissionId?: string;
  } = {},
) {
  if (amount <= 0) throw new Error("Amount must be positive.");

  return db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        delta: amount,
        balanceAfter: user.credits,
        reason: opts.reason ?? CREDIT_REASON.ADMIN_GRANT,
        note: opts.note,
        actorId: opts.actorId,
        submissionId: opts.submissionId,
      },
    });

    return user.credits;
  });
}

/** Admin removal — clamps at zero rather than allowing a negative balance. */
export async function revokeCredits(
  userId: string,
  amount: number,
  opts: { note?: string; actorId?: string } = {},
) {
  if (amount <= 0) throw new Error("Amount must be positive.");

  return db.$transaction(async (tx) => {
    const before = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { credits: true },
    });
    const taken = Math.min(amount, before.credits);
    if (taken === 0) return before.credits;

    const user = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: taken } },
      select: { credits: true },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        delta: -taken,
        balanceAfter: user.credits,
        reason: CREDIT_REASON.ADMIN_REVOKE,
        note: opts.note,
        actorId: opts.actorId,
      },
    });

    return user.credits;
  });
}
