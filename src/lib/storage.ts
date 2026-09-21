import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Two backends behind one interface.
 *
 * **Object storage** (S3 / Cloudflare R2) is used whenever `S3_BUCKET` is set,
 * and is what production runs on. Serverless hosts give each request a
 * throwaway filesystem, so a report written to disk is gone by the time the
 * customer clicks download.
 *
 * **Local disk** is the fallback, so `npm run dev` and both test suites work
 * with no cloud account and no credentials.
 *
 * Nothing outside this file knows which one is in use.
 */
const BUCKET = process.env.S3_BUCKET || "";

/** True when uploads go to object storage rather than the local disk. */
export const usingObjectStorage = BUCKET !== "";

// Runtime config, not a bundled asset — the bundler should not try to trace it.
const ROOT = path.resolve(
  /* turbopackIgnore: true */ process.env.STORAGE_DIR || "./storage",
);

/**
 * Keys are generated here and stored in the DB; they are never taken from user
 * input. This refuses anything that could address an object outside the space
 * we generate, so a tampered DB value still cannot reach another customer's
 * file or, on the disk backend, escape the storage directory.
 *
 * The check is string-based rather than path-based on purpose: the same key has
 * to be rejected identically on both backends, and an S3 key has no filesystem
 * to resolve against.
 */
export function isSafeKey(key: string) {
  if (key === "" || key.startsWith("/") || key.includes("\\")) return false;
  if (/^[a-zA-Z]:/.test(key)) return false; // a Windows drive letter
  return key.split("/").every((seg) => seg !== "" && seg !== "." && seg !== "..");
}

function assertSafeKey(key: string) {
  if (!isSafeKey(key))
    throw new Error("Refusing to access a path outside the storage root.");
  return key;
}

/** Disk backend only. Belt and braces: re-checks the resolved path too. */
function resolveKey(key: string) {
  const full = path.resolve(ROOT, assertSafeKey(key));
  if (full !== ROOT && !full.startsWith(ROOT + path.sep))
    throw new Error("Refusing to access a path outside the storage root.");
  return full;
}

let client: S3Client | null = null;

function s3() {
  if (!client) {
    for (const name of ["S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) {
      if (!process.env[name])
        throw new Error(`${name} must be set when S3_BUCKET is set.`);
    }
    client = new S3Client({
      // R2 ignores the region but the SDK insists on one; "auto" is what
      // Cloudflare's own examples use.
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return client;
}

export async function saveFile(scope: string, originalName: string, data: Buffer) {
  const ext = path.extname(originalName).slice(0, 10) || "";
  // Keys always use forward slashes, so a row written on Windows stays readable
  // when the app is deployed on Linux — and so it is a valid S3 key as-is.
  const key = assertSafeKey(`${scope}/${randomUUID()}${ext}`);

  if (usingObjectStorage) {
    await s3().send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: data }));
  } else {
    const full = resolveKey(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  return {
    key,
    size: data.byteLength,
    sha256: createHash("sha256").update(data).digest("hex"),
  };
}

export async function readStoredFile(key: string) {
  if (!usingObjectStorage) return readFile(resolveKey(key));

  assertSafeKey(key);
  const res = await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error(`Stored object ${key} came back empty.`);
  return Buffer.from(await res.Body.transformToByteArray());
}

export async function deleteStoredFile(key: string) {
  try {
    if (usingObjectStorage) {
      assertSafeKey(key);
      await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } else {
      await unlink(resolveKey(key));
    }
  } catch {
    /* already gone, or an unsafe key that addresses nothing — nothing to do */
  }
}
