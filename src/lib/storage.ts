import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Runtime config, not a bundled asset — the bundler should not try to trace it.
const ROOT = path.resolve(
  /* turbopackIgnore: true */ process.env.STORAGE_DIR || "./storage",
);

/**
 * Keys are generated here and stored in the DB; they are never taken from user
 * input. resolveKey additionally refuses anything that escapes ROOT so a
 * tampered DB value still cannot read outside the storage directory.
 */
function resolveKey(key: string) {
  const full = path.resolve(ROOT, key);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep))
    throw new Error("Refusing to access a path outside the storage root.");
  return full;
}

export async function saveFile(scope: string, originalName: string, data: Buffer) {
  const ext = path.extname(originalName).slice(0, 10) || "";
  // Stored keys always use forward slashes so a DB written on Windows stays
  // readable when the app is deployed on Linux.
  const key = path.join(scope, `${randomUUID()}${ext}`).split(path.sep).join("/");
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return {
    key,
    size: data.byteLength,
    sha256: createHash("sha256").update(data).digest("hex"),
  };
}

export async function readStoredFile(key: string) {
  return readFile(resolveKey(key));
}

export async function deleteStoredFile(key: string) {
  try {
    await unlink(resolveKey(key));
  } catch {
    /* already gone — nothing to do */
  }
}
