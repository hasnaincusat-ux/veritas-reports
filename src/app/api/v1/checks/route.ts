import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { createSubmission, SubmissionError } from "@/lib/submissions";
import { ACCEPTED_MIME, MAX_FILE_BYTES, ORIGIN, parseExclusions } from "@/lib/types";
import { serializeCheck } from "./serialize";

function problem(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * POST /api/v1/checks — multipart with a `file` field and optional `title`.
 * Charges one credit from the key owner's balance and queues the check.
 */
export async function POST(req: Request) {
  const key = await authenticateApiKey(req.headers.get("authorization"));
  if (!key) return problem(401, "unauthorized", "Missing or invalid API key.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return problem(400, "bad_request", "Send multipart/form-data with a `file` field.");
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0)
    return problem(400, "missing_file", "Attach the document as the `file` field.");
  if (file.size > MAX_FILE_BYTES)
    return problem(413, "file_too_large", "Files must be 100 MB or smaller.");
  if (!ACCEPTED_MIME[file.type])
    return problem(415, "unsupported_type", "Accepted: PDF, DOC, DOCX, PPT, PPTX, TXT.");

  try {
    const submission = await createSubmission({
      user: key.owner,
      fileName: file.name,
      mimeType: file.type,
      data: Buffer.from(await file.arrayBuffer()),
      title: String(form.get("title") ?? ""),
      // Same field names as the web form; omitted fields fall back to defaults.
      exclusions: parseExclusions((k) => form.get(k)),
      source: { origin: ORIGIN.API, apiKeyId: key.id },
    });

    await audit(key.ownerId, "submission.create", {
      type: "Submission",
      id: submission.id,
      meta: { reference: submission.reference, via: "api", keyId: key.id },
    });

    return NextResponse.json(serializeCheck(submission), { status: 202 });
  } catch (err) {
    if (err instanceof SubmissionError) {
      const insufficient = /credits/i.test(err.message);
      return problem(
        insufficient ? 402 : 422,
        insufficient ? "insufficient_credits" : "rejected",
        err.message,
      );
    }
    throw err;
  }
}

/** GET /api/v1/checks — the key owner's recent checks, newest first. */
export async function GET(req: Request) {
  const key = await authenticateApiKey(req.headers.get("authorization"));
  if (!key) return problem(401, "unauthorized", "Missing or invalid API key.");

  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit")) || 25, 100);

  const rows = await db.submission.findMany({
    where: { userId: key.ownerId, origin: ORIGIN.API },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ data: rows.map(serializeCheck) });
}
