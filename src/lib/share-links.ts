import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { grantCredits, spendCredits } from "./credits";
import { CREDIT_REASON } from "./types";

export class ShareLinkError extends Error {}

// No 0/O/1/I/l — these codes get read aloud and typed from phone screens.
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function makeLinkCode(length = 10) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function makeAccessToken() {
  return randomBytes(24).toString("base64url");
}

/**
 * Reserve `allocated` checks out of the owner's balance into a new link.
 * spendCredits is the atomic guard — if the owner cannot cover it, nothing is
 * created.
 */
export async function createShareLink(
  ownerId: string,
  input: { label: string; allocated: number },
) {
  const label = input.label.trim();
  if (label.length < 1) throw new ShareLinkError("Give the link a label.");
  if (!Number.isInteger(input.allocated) || input.allocated < 1 || input.allocated > 500)
    throw new ShareLinkError("Checks on a link must be a whole number from 1 to 500.");

  let code = makeLinkCode();
  for (let i = 0; i < 5; i++) {
    if (!(await db.shareLink.findUnique({ where: { code }, select: { id: true } })))
      break;
    code = makeLinkCode();
  }

  const link = await db.shareLink.create({
    data: { ownerId, code, label, allocated: input.allocated },
  });

  try {
    await spendCredits(ownerId, input.allocated, {
      reason: CREDIT_REASON.LINK_RESERVE,
      note: `Link "${label}" (${input.allocated} check${input.allocated > 1 ? "s" : ""})`,
    });
  } catch (err) {
    await db.shareLink.delete({ where: { id: link.id } });
    throw new ShareLinkError(
      `You need ${input.allocated} credit${input.allocated > 1 ? "s" : ""} to create this link.`,
    );
  }

  return link;
}

/** Cancel a link and return whatever it has not used to the owner. */
export async function cancelShareLink(ownerId: string, linkId: string) {
  const link = await db.shareLink.findUnique({ where: { id: linkId } });
  if (!link || link.ownerId !== ownerId) throw new ShareLinkError("Link not found.");
  if (link.status === "CANCELLED")
    throw new ShareLinkError("That link is already cancelled.");

  const unused = link.allocated - link.used;

  await db.shareLink.update({
    where: { id: link.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  if (unused > 0) {
    await grantCredits(ownerId, unused, {
      reason: CREDIT_REASON.LINK_REFUND,
      note: `Unused checks from "${link.label}"`,
    });
  }

  return unused;
}

/**
 * Take one check off a link for a recipient upload. The conditional updateMany
 * means two people opening the same one-check link cannot both get through.
 */
export async function consumeLinkCheck(linkId: string) {
  const claimed = await db.shareLink.updateMany({
    where: { id: linkId, status: "ACTIVE", used: { lt: db.shareLink.fields.allocated } },
    data: { used: { increment: 1 } },
  });
  if (claimed.count !== 1) throw new ShareLinkError("This link has no checks left.");

  const link = await db.shareLink.findUniqueOrThrow({ where: { id: linkId } });
  if (link.used >= link.allocated) {
    await db.shareLink.update({ where: { id: linkId }, data: { status: "EXHAUSTED" } });
  }
  return link;
}

/** Give the check back if the upload failed after it was claimed. */
export async function releaseLinkCheck(linkId: string) {
  await db.shareLink.updateMany({
    where: { id: linkId, used: { gt: 0 } },
    data: { used: { decrement: 1 }, status: "ACTIVE" },
  });
}

export function shareLinkUrl(code: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/c/${code}`;
}
