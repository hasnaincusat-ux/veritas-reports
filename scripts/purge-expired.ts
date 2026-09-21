/**
 * Deletes source uploads past their retention date. Reports are kept — only the
 * customer's original document is purged, which is what the 7-day promise on
 * the marketing page refers to.
 *
 * Run on a schedule, e.g. daily:
 *   npx tsx --conditions=react-server scripts/purge-expired.ts
 */
import { PrismaClient } from "@prisma/client";
import { deleteStoredFile, isSafeKey, usingObjectStorage } from "../src/lib/storage";

const db = new PrismaClient();

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
    // The storage helper ignores an unsafe key silently; say so here, because a
    // key that fails this check means the row has been tampered with.
    if (!isSafeKey(s.storagePath)) {
      console.warn(`Skipping ${s.reference}: key escapes the storage root.`);
      continue;
    }

    await deleteStoredFile(s.storagePath);
    removed++;

    // Blank the pointer so the record stays but the file is known to be gone.
    await db.submission.update({
      where: { id: s.id },
      data: { storagePath: "", purgeAfter: null },
    });
  }

  console.log(
    `Purged ${removed} source file(s) across ${due.length} submission(s) ` +
      `from ${usingObjectStorage ? "object storage" : "local disk"}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
