/**
 * Storage backend checks. Runs the *same* assertions against whichever backend
 * the environment selects, so both are proven to behave identically:
 *
 *   npx tsx --conditions=react-server scripts/selftest-storage.ts        # disk
 *   STORAGE_TEST_S3=1 npx tsx --conditions=react-server scripts/selftest-storage.ts
 *
 * The S3 run talks to a throwaway in-process server that speaks just enough of
 * the protocol. That is deliberate: it exercises the real AWS SDK, real signing
 * and real HTTP, so it catches wiring mistakes a mock of our own code would not.
 */
import { createServer } from "node:http";
import { rm } from "node:fs/promises";
import path from "node:path";

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? `  (${detail})` : ""}`);
  }
}

async function expectThrow(label: string, fn: () => Promise<unknown>, contains: string) {
  try {
    await fn();
    check(label, false, "did not throw");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    check(label, msg.includes(contains), msg);
  }
}

/** The smallest thing the S3 SDK will accept as a bucket. */
function startFakeS3(objects: Map<string, Buffer>) {
  const server = createServer((req, res) => {
    // forcePathStyle puts the bucket first: /bucket/scope/uuid.ext
    const url = new URL(req.url || "/", "http://localhost");
    const key = decodeURIComponent(url.pathname.replace(/^\/[^/]+\//, ""));

    if (req.method === "PUT") {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        objects.set(key, Buffer.concat(chunks));
        res.writeHead(200, { ETag: '"fake"' }).end();
      });
      return;
    }
    if (req.method === "GET") {
      const body = objects.get(key);
      if (!body) {
        // A faithful S3 error document, so the SDK surfaces NoSuchKey rather
        // than a generic UnknownError — otherwise the test would pass on a
        // failure mode the real service never produces.
        res
          .writeHead(404, {
            "Content-Type": "application/xml",
            "x-amz-request-id": "fake-request-id",
            "x-amz-id-2": "fake-host-id",
          })
          .end(
            `<?xml version="1.0" encoding="UTF-8"?>` +
              `<Error><Code>NoSuchKey</Code>` +
              `<Message>The specified key does not exist.</Message>` +
              `<Key>${key}</Key><RequestId>fake-request-id</RequestId>` +
              `<HostId>fake-host-id</HostId></Error>`,
          );
        return;
      }
      res.writeHead(200, { "Content-Length": String(body.byteLength) }).end(body);
      return;
    }
    if (req.method === "DELETE") {
      objects.delete(key);
      res.writeHead(204).end();
      return;
    }
    res.writeHead(400).end();
  });

  return new Promise<{ port: number; close: () => void }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ port, close: () => server.close() });
    });
  });
}

async function main() {
  const useS3 = process.env.STORAGE_TEST_S3 === "1";
  const objects = new Map<string, Buffer>();
  let fake: { port: number; close: () => void } | null = null;

  if (useS3) {
    fake = await startFakeS3(objects);
    // Must be set BEFORE the storage module is imported — it reads them once.
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_ENDPOINT = `http://127.0.0.1:${fake.port}`;
    process.env.S3_ACCESS_KEY_ID = "test-access-key";
    process.env.S3_SECRET_ACCESS_KEY = "test-secret-key";
    process.env.S3_REGION = "auto";
  } else {
    delete process.env.S3_BUCKET;
    process.env.STORAGE_DIR = path.resolve("./storage-test");
  }

  const storage = await import("../src/lib/storage");
  const { saveFile, readStoredFile, deleteStoredFile, isSafeKey, usingObjectStorage } =
    storage;

  console.log(
    `\nSTORAGE — ${usingObjectStorage ? "object storage (S3/R2)" : "local disk"}`,
  );
  check("the expected backend is selected", usingObjectStorage === useS3);

  // ---------------------------------------------------------------- round trip
  const doc = Buffer.from("The quick brown fox jumps over the lazy dog.\n".repeat(40));
  const saved = await saveFile("submissions/user-1", "essay.docx", doc);

  check(
    "save returns a forward-slash key",
    saved.key.includes("/") && !saved.key.includes("\\"),
    saved.key,
  );
  check("save keeps the extension", saved.key.endsWith(".docx"), saved.key);
  check("save reports the right size", saved.size === doc.byteLength, `${saved.size}`);
  check("save reports a sha256", /^[0-9a-f]{64}$/.test(saved.sha256), saved.sha256);

  const back = await readStoredFile(saved.key);
  check(
    "the file reads back byte-identical",
    back.equals(doc),
    `${back.byteLength} bytes`,
  );

  if (useS3) check("the object really reached the bucket", objects.has(saved.key));

  // ------------------------------------------------------------------ deletion
  await deleteStoredFile(saved.key);
  if (useS3) check("delete removes it from the bucket", !objects.has(saved.key));
  await expectThrow(
    "reading a deleted file fails",
    () => readStoredFile(saved.key),
    useS3 ? "does not exist" : "ENOENT",
  );

  check(
    "deleting a file twice is harmless",
    (await deleteStoredFile(saved.key)) === undefined,
  );

  // ------------------------------------------------------------------ distinct
  const a = await saveFile("submissions/x", "same.docx", doc);
  const b = await saveFile("submissions/x", "same.docx", doc);
  check("identical filenames get distinct keys", a.key !== b.key);

  // --------------------------------------------------------------- key safety
  console.log("\nKEY SAFETY");

  for (const bad of [
    "../../../../Windows/win.ini",
    "/etc/passwd",
    "submissions/../../secret",
    "C:/Windows/win.ini",
    "submissions\\user\\file.docx",
    "",
    "submissions//file.docx",
    "./file.docx",
  ]) {
    check(`rejected: ${JSON.stringify(bad)}`, !isSafeKey(bad));
  }

  check("a real generated key is accepted", isSafeKey(a.key), a.key);

  await expectThrow(
    "keys cannot escape the storage root",
    () => readStoredFile("../../../../Windows/win.ini"),
    "outside the storage root",
  );

  await expectThrow(
    "an absolute key is refused",
    () => readStoredFile("/etc/passwd"),
    "outside the storage root",
  );

  // ------------------------------------------------------------------- cleanup
  await deleteStoredFile(a.key);
  await deleteStoredFile(b.key);
  fake?.close();
  if (!useS3) await rm(path.resolve("./storage-test"), { recursive: true, force: true });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
