/**
 * Share links and API access — the two features an admin switches on per
 * customer. Covers reservation/refund accounting, the one-check race, guest
 * token access, key auth, tenant isolation and revocation.
 *   npm run dev   (in another terminal)
 *   npx tsx --conditions=react-server scripts/selftest-features.ts
 */
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { createSubmission } from "../src/lib/submissions";
import {
  cancelShareLink,
  consumeLinkCheck,
  createShareLink,
  ShareLinkError,
} from "../src/lib/share-links";
import { authenticateApiKey, generateApiKey, revokeApiKey } from "../src/lib/api-keys";
import { DEFAULT_EXCLUSIONS, ORIGIN, describeExclusions, parseExclusions } from "../src/lib/types";

const BASE = "http://localhost:3000";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
let passed = 0, failed = 0;

function check(name: string, ok: boolean, detail = "") {
  ok ? passed++ : failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}
async function expectThrow(name: string, fn: () => Promise<unknown>, match?: string) {
  try { await fn(); check(name, false, "resolved instead of throwing"); }
  catch (e) { const m = e instanceof Error ? e.message : String(e); check(name, match ? m.includes(match) : true, m); }
}
async function makeUser(credits: number, flags: Partial<{ featureShareLinks: boolean; featureApi: boolean }> = {}) {
  return db.user.create({
    data: {
      email: `feat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.local`,
      name: "Feature Tester", passwordHash: await bcrypt.hash("x", 4), credits, ...flags,
    },
  });
}
const balance = async (id: string) => (await db.user.findUniqueOrThrow({ where: { id } })).credits;

async function main() {
  console.log("\nSHARE LINKS — accounting");

  const owner = await makeUser(5, { featureShareLinks: true });
  const link = await createShareLink(owner.id, { label: "Priya", allocated: 3 });
  check("creating a link moves the checks out of the balance", (await balance(owner.id)) === 2);
  check("link code is url-safe and unambiguous", /^[a-hj-km-np-z2-9]{10}$/.test(link.code), link.code);
  const reserve = await db.creditTransaction.findFirst({ where: { userId: owner.id, reason: "LINK_RESERVE" } });
  check("reservation is written to the ledger", reserve?.delta === -3);

  await expectThrow("a link the owner cannot afford is refused", () =>
    createShareLink(owner.id, { label: "Too big", allocated: 50 }), "credit");
  check("the refused link left no row behind",
    (await db.shareLink.count({ where: { ownerId: owner.id } })) === 1);

  await expectThrow("zero-check links are rejected", () =>
    createShareLink(owner.id, { label: "x", allocated: 0 }), "1 to 500");

  await consumeLinkCheck(link.id);
  const returned = await cancelShareLink(owner.id, link.id);
  check("cancelling returns only the unused checks", returned === 2 && (await balance(owner.id)) === 4,
    `returned ${returned}, balance ${await balance(owner.id)}`);
  const after = await db.shareLink.findUniqueOrThrow({ where: { id: link.id } });
  check("cancelled link is marked and stamped", after.status === "CANCELLED" && after.cancelledAt !== null);
  await expectThrow("cancelling twice is refused", () => cancelShareLink(owner.id, link.id), "already");

  const stranger = await makeUser(0, { featureShareLinks: true });
  await expectThrow("another customer cannot cancel someone else's link", () =>
    cancelShareLink(stranger.id, link.id), "not found");

  console.log("\nSHARE LINKS — the one-check race");
  const single = await createShareLink(owner.id, { label: "One", allocated: 1 });
  const results = await Promise.allSettled([
    consumeLinkCheck(single.id), consumeLinkCheck(single.id), consumeLinkCheck(single.id),
  ]);
  const won = results.filter((r) => r.status === "fulfilled").length;
  const refused = results.filter((r) => r.status === "rejected" && r.reason instanceof ShareLinkError).length;
  const singleAfter = await db.shareLink.findUniqueOrThrow({ where: { id: single.id } });
  check("three simultaneous uploads on a one-check link: exactly one gets through",
    won === 1 && refused === 2 && singleAfter.used === 1 && singleAfter.status === "EXHAUSTED",
    `won ${won}, used ${singleAfter.used}, status ${singleAfter.status}`);

  console.log("\nSHARE LINKS — guest access");
  const guestLink = await createShareLink(owner.id, { label: "Guest", allocated: 2 });
  const url = `${BASE}/c/${guestLink.code}`;
  const landing = await fetch(url);
  check("public landing page renders for an active link", landing.status === 200 && (await landing.text()).includes("Check your document"));

  const before = await balance(owner.id);
  await consumeLinkCheck(guestLink.id);
  const sub = await createSubmission({
    user: { ...owner, credits: before }, fileName: "guest.docx", mimeType: DOCX,
    data: Buffer.from("guest upload body"),
    source: { origin: ORIGIN.SHARE_LINK, shareLinkId: guestLink.id, guestName: "Priya", prepaid: true },
  });
  check("a prepaid upload does not touch the owner's balance", (await balance(owner.id)) === before);
  check("share-link submissions carry an access token", typeof sub.accessToken === "string" && sub.accessToken.length > 20);
  check("submission is tagged with its origin and link", sub.origin === "SHARE_LINK" && sub.shareLinkId === guestLink.id);

  const good = await fetch(`${BASE}/api/submissions/${sub.id}/status?t=${encodeURIComponent(sub.accessToken!)}`);
  check("recipient can poll status with the token", good.status === 200, `status ${good.status}`);
  const bad = await fetch(`${BASE}/api/submissions/${sub.id}/status?t=wrong-token`);
  check("a wrong token gets 404, not 401 (nothing to enumerate)", bad.status === 404, `status ${bad.status}`);
  const none = await fetch(`${BASE}/api/submissions/${sub.id}/status`);
  check("no token and no session gets 404", none.status === 404, `status ${none.status}`);
  const page = await fetch(`${BASE}/c/${guestLink.code}/${sub.id}?t=${encodeURIComponent(sub.accessToken!)}`);
  check("result page renders with the token", page.status === 200);
  const pageNoT = await fetch(`${BASE}/c/${guestLink.code}/${sub.id}`);
  check("result page is a 404 without the token", pageNoT.status === 404, `status ${pageNoT.status}`);

  const cancelled = await db.shareLink.findUniqueOrThrow({ where: { id: link.id } });
  const dead = await fetch(`${BASE}/c/${cancelled.code}`);
  check("a cancelled link's landing says so and hides the form",
    dead.status === 200 && (await dead.text()).includes("not active"));

  console.log("\nAPI — keys");
  const dev = await makeUser(3);
  const { key, record } = await generateApiKey(dev.id, "CI server");
  check("key has the expected shape", key.startsWith("vr_live_") && key.length > 30);
  check("only a hash is stored, never the key", record.hash !== key && !record.hash.includes(key.slice(8, 20)));
  check("prefix reveals just the head", record.prefix === key.slice(0, 12));

  check("key does nothing until an admin enables the feature",
    (await authenticateApiKey(`Bearer ${key}`)) === null);
  await db.user.update({ where: { id: dev.id }, data: { featureApi: true } });
  check("enabled: key resolves to its owner", (await authenticateApiKey(`Bearer ${key}`))?.ownerId === dev.id);
  check("garbage keys are rejected", (await authenticateApiKey("Bearer vr_live_nope")) === null);
  check("missing header is rejected", (await authenticateApiKey(null)) === null);

  console.log("\nAPI — HTTP");
  const form = new FormData();
  form.append("file", new Blob([Buffer.from("api upload body")], { type: DOCX }), "paper.docx");
  form.append("title", "API paper");

  const unauth = await fetch(`${BASE}/api/v1/checks`, { method: "POST", body: form });
  check("POST without a key is 401", unauth.status === 401, `status ${unauth.status}`);

  const form2 = new FormData();
  form2.append("file", new Blob([Buffer.from("api upload body")], { type: DOCX }), "paper.docx");
  const created = await fetch(`${BASE}/api/v1/checks`, {
    method: "POST", headers: { authorization: `Bearer ${key}` }, body: form2,
  });
  const createdJson = await created.json();
  check("POST with a valid key queues a check (202)", created.status === 202 && createdJson.status === "queued",
    `status ${created.status} ${JSON.stringify(createdJson).slice(0, 120)}`);
  check("API check charges one credit from the key owner", (await balance(dev.id)) === 2);
  check("API check is tagged with origin and key",
    (await db.submission.findUnique({ where: { id: createdJson.check_id } }))?.apiKeyId === record.id);

  const polled = await fetch(`${BASE}/api/v1/checks/${createdJson.check_id}`, { headers: { authorization: `Bearer ${key}` } });
  const polledJson = await polled.json();
  check("GET /checks/{id} returns the check", polled.status === 200 && polledJson.reference === createdJson.reference);
  check("reports are null until completed", polledJson.reports === null);

  const list = await fetch(`${BASE}/api/v1/checks`, { headers: { authorization: `Bearer ${key}` } });
  check("GET /checks lists the owner's API checks", list.status === 200 && (await list.json()).data.length === 1);

  const other = await makeUser(1, { featureApi: true });
  const { key: otherKey } = await generateApiKey(other.id, "other");
  const cross = await fetch(`${BASE}/api/v1/checks/${createdJson.check_id}`, { headers: { authorization: `Bearer ${otherKey}` } });
  check("another customer's key gets 404 for this check", cross.status === 404, `status ${cross.status}`);

  const dlCross = await fetch(`${BASE}/api/submissions/${createdJson.check_id}/download/similarity`, { headers: { authorization: `Bearer ${otherKey}` } });
  check("cross-tenant download is 404", dlCross.status === 404, `status ${dlCross.status}`);

  const noFile = await fetch(`${BASE}/api/v1/checks`, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: new FormData() });
  check("POST without a file is a 400 with a code", noFile.status === 400 && (await noFile.json()).error.code === "missing_file");

  await db.user.update({ where: { id: dev.id }, data: { credits: 0 } });
  const form3 = new FormData();
  form3.append("file", new Blob([Buffer.from("x")], { type: DOCX }), "p.docx");
  const broke = await fetch(`${BASE}/api/v1/checks`, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form3 });
  check("out of credits is a 402", broke.status === 402, `status ${broke.status}`);

  await revokeApiKey(dev.id, record.id);
  const revoked = await fetch(`${BASE}/api/v1/checks`, { headers: { authorization: `Bearer ${key}` } });
  check("a revoked key is refused immediately", revoked.status === 401, `status ${revoked.status}`);
  await expectThrow("revoking again is refused", () => revokeApiKey(dev.id, record.id), "already");

  await db.user.update({ where: { id: other.id }, data: { featureApi: false } });
  const disabled = await fetch(`${BASE}/api/v1/checks`, { headers: { authorization: `Bearer ${otherKey}` } });
  check("admin switching the feature off kills live keys", disabled.status === 401, `status ${disabled.status}`);

  console.log("");
  console.log("REPORT FILTERS (exclusions)");

  const field = (o: Record<string, string>) => (k: string) => (k in o ? o[k] : null);

  const both = parseExclusions(field({ excludeBibliography: "on", excludeQuotes: "on" }));
  check("ticked boxes are read as excluded", both.excludeBibliography && both.excludeQuotes);

  const neither = parseExclusions(field({}));
  check("unticked boxes send nothing and read as not excluded",
    !neither.excludeBibliography && !neither.excludeQuotes);

  const words = parseExclusions(field({ smallMatchMode: "WORDS", smallMatchValue: "12" }));
  check("word threshold is kept", words.smallMatchMode === "WORDS" && words.smallMatchValue === 12);

  const over = parseExclusions(field({ smallMatchMode: "PERCENT", smallMatchValue: "9999" }));
  check("percent threshold is clamped to 100", over.smallMatchValue === 100, `${over.smallMatchValue}`);

  const under = parseExclusions(field({ smallMatchMode: "WORDS", smallMatchValue: "-5" }));
  check("threshold below one is clamped up", under.smallMatchValue === 1, `${under.smallMatchValue}`);

  const junkMode = parseExclusions(field({ smallMatchMode: "DROP TABLE", smallMatchValue: "5" }));
  check("an unknown mode falls back to OFF", junkMode.smallMatchMode === "OFF");

  const junkValue = parseExclusions(field({ smallMatchMode: "WORDS", smallMatchValue: "abc" }));
  check("a non-numeric threshold disables the exclusion", junkValue.smallMatchMode === "OFF");

  check("summary names each active exclusion",
    describeExclusions({ excludeBibliography: true, excludeQuotes: true, smallMatchMode: "WORDS", smallMatchValue: 8 }).length === 3);
  check("summary says so when nothing is excluded",
    describeExclusions({ excludeBibliography: false, excludeQuotes: false, smallMatchMode: "OFF", smallMatchValue: null })[0]
      .includes("everything counted"));

  const picky = await makeUser(2);
  const withOpts = await createSubmission({
    user: picky, fileName: "opts.docx", mimeType: DOCX, data: Buffer.from("body"),
    exclusions: { excludeBibliography: false, excludeQuotes: true, smallMatchMode: "PERCENT", smallMatchValue: 3 },
  });
  check("chosen exclusions are stored on the submission",
    withOpts.excludeBibliography === false && withOpts.excludeQuotes === true &&
    withOpts.smallMatchMode === "PERCENT" && withOpts.smallMatchValue === 3);

  const plain = await createSubmission({
    user: { ...picky, credits: 1 }, fileName: "plain.docx", mimeType: DOCX, data: Buffer.from("body"),
  });
  check("omitting exclusions applies the sensible defaults",
    plain.excludeBibliography === DEFAULT_EXCLUSIONS.excludeBibliography &&
    plain.excludeQuotes === DEFAULT_EXCLUSIONS.excludeQuotes &&
    plain.smallMatchMode === "OFF");

  const optForm = new FormData();
  optForm.append("file", new Blob([Buffer.from("api body")], { type: DOCX }), "opt.docx");
  optForm.append("excludeQuotes", "on");
  optForm.append("smallMatchMode", "WORDS");
  optForm.append("smallMatchValue", "15");
  const optUser = await makeUser(2, { featureApi: true });
  const { key: optKey } = await generateApiKey(optUser.id, "opts");
  const optRes = await fetch(`${BASE}/api/v1/checks`, {
    method: "POST", headers: { authorization: `Bearer ${optKey}` }, body: optForm,
  });
  const optJson = await optRes.json();
  check("API accepts the same filter fields",
    optRes.status === 202 && optJson.exclusions.quotes === true &&
    optJson.exclusions.bibliography === false &&
    optJson.exclusions.small_matches?.value === 15,
    JSON.stringify(optJson.exclusions));

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    await db.user.deleteMany({ where: { email: { contains: "@test.local" } } });
    await db.$disconnect();
  });
