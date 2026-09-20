import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys";
import { db } from "@/lib/db";
import { serializeCheck } from "../serialize";

/** GET /api/v1/checks/{id} — poll one check. Reports carry download URLs once ready. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const key = await authenticateApiKey(req.headers.get("authorization"));
  if (!key)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Missing or invalid API key." } },
      { status: 401 },
    );

  const { id } = await params;
  const submission = await db.submission.findUnique({ where: { id } });

  // Another customer's check is indistinguishable from a missing one.
  if (!submission || submission.userId !== key.ownerId)
    return NextResponse.json(
      { error: { code: "not_found", message: "No check with that id." } },
      { status: 404 },
    );

  return NextResponse.json(serializeCheck(submission), {
    headers: { "Cache-Control": "no-store" },
  });
}
