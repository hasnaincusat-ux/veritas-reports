/**
 * End-to-end checks for the parts where a bug costs real money or leaks data:
 * the credit ledger, the upload pipeline, storage path handling and the HTTP
 * auth guards. Run against a dev server on :3000 —  npx tsx scripts/selftest.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { db } from "../src/lib/db";
import { grantCredits, revokeCredits, spendCredits, InsufficientCreditsError } from "../src/lib/credits";
import { createSubmission, SubmissionError } from "../src/lib/submissions";
import { saveFile, readStoredFile } from "../src/lib/storage";

const BASE = "http://localhost:3000";
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function expectThrow(name: string, fn: () => Promise<unknown>, match?: string) {
  try {
    await fn();
    check(name, false, "expected it to throw, but it resolved");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    check(name, match ? msg.includes(match) : true, `threw: ${msg}`);
  }
}

async function makeUser(credits: number, role: "USER" | "ADMIN" = "USER") {
  const email = `selftest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  return db.user.create({
    data: {
      email,
      name: "Self Test",
      passwordHash: await bcrypt.hash("irrelevant-for-these-tests", 4),
      role,
      credits,
    },
  });
}

async function sessionCookie(userId: string, role: string) {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
  return `vr_session=${token}`;
}

const TXT = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function main() {
  console.log("\nCREDIT LEDGER");

  const u1 = await makeUser(5);
  await spendCredits(u1.id, 2);
  const afterSpend = await db.user.findUniqueOrThrow({ where: { id: u1.id } });
  check("spend decrements the balance", afterSpend.credits === 3, `got ${afterSpend.credits}`);

  const ledger = await db.creditTransaction.findFirst({
    where: { userId: u1.id },
    orderBy: { createdAt: "desc" },
  });
  check("spend writes a ledger row with the running balance",
    ledger?.delta === -2 && ledger?.balanceAfter === 3);

  await grantCredits(u1.id, 4);
  const afterGrant = await db.user.findUniqueOrThrow({ where: { id: u1.id } });
  check("grant increments the balance", afterGrant.credits === 7, `got ${afterGrant.credits}`);

  await expectThrow("spending more than the balance is refused",
    () => spendCredits(u1.id, 999), "Not enough credits");

  await revokeCredits(u1.id, 999);
  const clamped = await db.user.findUniqueOrThrow({ where: { id: u1.id } });
  check("revoking more than held clamps at zero, never negative", clamped.credits === 0,
    `got ${clamped.credits}`);

  await expectThrow("zero/negative amounts are rejected",
    () => spendCredits(u1.id, 0), "must be positive");

  // The race that would otherwise let one credit buy two reports.
  const racer = await makeUser(1);
  const results = await Promise.allSettled([
    spendCredits(racer.id, 1),
    spendCredits(racer.id, 1),
    spendCredits(racer.id, 1),
  ]);
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const rejectedCorrectly = results.filter(
    (r) => r.status === "rejected" && r.reason instanceof InsufficientCreditsError,
  ).length;
  const racerAfter = await db.user.findUniqueOrThrow({ where: { id: racer.id } });
  check("concurrent spends cannot oversell one credit",
    ok === 1 && rejectedCorrectly === 2 && racerAfter.credits === 0,
    `${ok} succeeded, balance ${racerAfter.credits}`);

  console.log("\nUPLOAD PIPELINE");

  const uploader = await makeUser(2);
  const doc = Buffer.from("A test document body for the self check.", "utf8");

  const sub = await createSubmission({
    user: uploader,
    fileName: "my thesis.docx",
    mimeType: TXT,
    data: doc,
    title: "",
  });
  check("submission is created and queued", sub.status === "QUEUED", sub.status);
  check("reference is human-readable", /^VR-[A-Z0-9]{6}$/.test(sub.reference), sub.reference);
  check("title falls back to the filename without extension", sub.title === "my thesis",
    sub.title);

  const billed = await db.user.findUniqueOrThrow({ where: { id: uploader.id } });
  check("upload charges exactly one credit", billed.credits === 1, `got ${billed.credits}`);

  const charge = await db.creditTransaction.findFirst({
    where: { submissionId: sub.id, reason: "SUBMISSION_CHARGE" },
  });
  check("the charge is linked to its submission", charge !== null);

  const events = await db.submissionEvent.findMany({ where: { submissionId: sub.id } });
  check("a progress event is recorded for the user", events.length === 1, `${events.length}`);

  check("stored file is readable back",
    (await readStoredFile(sub.storagePath)).toString() === doc.toString());

  check("retention date is set 7 days out",
    sub.purgeAfter !== null &&
      Math.abs(sub.purgeAfter.getTime() - (Date.now() + 7 * 86400_000)) < 60_000);

  await expectThrow("unsupported file types are rejected",
    () => createSubmission({
      user: uploader, fileName: "virus.exe",
      mimeType: "application/x-msdownload", data: doc,
    }), "PDF, Word");

  await expectThrow("empty files are rejected",
    () => createSubmission({
      user: uploader, fileName: "empty.docx", mimeType: TXT, data: Buffer.alloc(0),
    }), "Choose a document");

  // Spend the last credit, then confirm the next upload is refused *and* that
  // the refused attempt left no orphan row behind.
  await createSubmission({ user: { ...uploader, credits: 1 }, fileName: "second.docx", mimeType: TXT, data: doc });
  const broke = await db.user.findUniqueOrThrow({ where: { id: uploader.id } });
  await expectThrow("upload without credits is refused",
    () => createSubmission({ user: broke, fileName: "third.docx", mimeType: TXT, data: doc }),
    "no credits left");
  const count = await db.submission.count({ where: { userId: uploader.id } });
  check("a refused upload leaves no orphan submission", count === 2, `${count} rows`);

  console.log("\nSTORAGE SAFETY");

  await expectThrow("keys cannot escape the storage root",
    () => readStoredFile("../../../../Windows/win.ini"), "outside the storage root");

  const a = await saveFile("submissions/x", "same.docx", doc);
  const b = await saveFile("submissions/x", "same.docx", doc);
  check("identical filenames get distinct keys", a.key !== b.key);

  console.log("\nHTTP AUTH GUARDS");

  const owner = await db.user.findUniqueOrThrow({ where: { id: uploader.id } });
  const stranger = await makeUser(1);
  const admin = await makeUser(0, "ADMIN");

  const ownerCookie = await sessionCookie(owner.id, "USER");
  const strangerCookie = await sessionCookie(stranger.id, "USER");
  const adminCookie = await sessionCookie(admin.id, "ADMIN");

  const get = (path: string, cookie?: string) =>
    fetch(BASE + path, {
      headers: cookie ? { cookie } : {},
      redirect: "manual",
    });

  const anonDash = await get("/dashboard");
  check("anonymous visitor is redirected away from the dashboard",
    anonDash.status === 307 || anonDash.status === 302, `status ${anonDash.status}`);

  const anonAdmin = await get("/admin");
  check("anonymous visitor is redirected away from the admin panel",
    anonAdmin.status === 307 || anonAdmin.status === 302, `status ${anonAdmin.status}`);

  const userHitsAdmin = await get("/admin", ownerCookie);
  check("a normal user cannot reach the admin panel",
    userHitsAdmin.status === 307 || userHitsAdmin.status === 302,
    `status ${userHitsAdmin.status}`);

  check("a signed-in user can load their dashboard",
    (await get("/dashboard", ownerCookie)).status === 200);
  check("an admin can load the admin panel",
    (await get("/admin", adminCookie)).status === 200);
  check("the public homepage renders for anonymous visitors",
    (await get("/")).status === 200);

  const own = await get(`/api/submissions/${sub.id}/status`, ownerCookie);
  check("owner can read their own submission status", own.status === 200);

  const other = await get(`/api/submissions/${sub.id}/status`, strangerCookie);
  check("another user gets 404 for a submission they do not own",
    other.status === 404, `status ${other.status}`);

  const anonStatus = await get(`/api/submissions/${sub.id}/status`);
  // 404 rather than 401 on purpose: an unauthenticated caller must not be able
  // to tell a real submission id from a made-up one.
  check("anonymous status request is rejected", anonStatus.status === 404,
    `status ${anonStatus.status}`);

  const srcAsUser = await get(`/api/submissions/${sub.id}/download/source`, ownerCookie);
  check("the original upload is not downloadable by the customer",
    srcAsUser.status === 404, `status ${srcAsUser.status}`);

  const srcAsAdmin = await get(`/api/submissions/${sub.id}/download/source`, adminCookie);
  check("an admin can download the original upload", srcAsAdmin.status === 200,
    `status ${srcAsAdmin.status}`);

  const notReady = await get(`/api/submissions/${sub.id}/download/similarity`, ownerCookie);
  check("a report that does not exist yet is not served", notReady.status === 404,
    `status ${notReady.status}`);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Clean up every fixture this run created.
    await db.user.deleteMany({ where: { email: { contains: "@test.local" } } });
    await db.$disconnect();
    await new PrismaClient().$disconnect();
  });
