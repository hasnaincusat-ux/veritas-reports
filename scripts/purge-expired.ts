/**
 * Deletes source uploads past their retention date. Reports are kept — only the
 * customer's original document is purged, which is what the 7-day promise on
 * the marketing page refers to.
 *
 * Run on a schedule, e.g. daily:  npx tsx scripts/purge-expired.ts
 */
import { PrismaClient } from "@prisma/client";
import { unlink } from "node:fs/promises";
import path from "node:path";

const db = new PrismaClient();
const ROOT = path.resolve(process.env.STORAGE_DIR || "./storage");

async function main() {
  const due = await db.submission.findMany({
    where: {
      purgeAfter: { lte: new Date() },
      storagePath: { not: "" },
    },
    select: { id: true, reference: true, storagePath: true },
  });

  if (due.length === 0) {
    console.log("Nothing to purge.");
    return;
  }

  let removed = 0;
  for (const s of due) {
    const full = path.resolve(ROOT, s.storagePath);
    // Same guard as the storage helper: never unlink outside the storage root.
    if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {
      console.warn(`Skipping ${s.reference}: path escapes the storage root.`);
      continue;
    }

    try {
      await unlink(full);
      removed++;
    } catch {
      /* already gone */
    }

    // Blank the pointer so the record stays but the file is known to be gone.
    await db.submission.update({
      where: { id: s.id },
      data: { storagePath: "", purgeAfter: null },
    });
  }

  console.log(`Purged ${removed} source file(s) across ${due.length} submission(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
