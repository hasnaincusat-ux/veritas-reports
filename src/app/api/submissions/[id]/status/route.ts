import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveAccess } from "@/lib/submission-access";

/** Polled by the live progress trackers — dashboard and share-link result page alike. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { access } = await resolveAccess(id, req);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const submission = await db.submission.findUnique({
    where: { id },
    select: {
      status: true,
      similarityScore: true,
      aiScore: true,
      updatedAt: true,
      events: {
        orderBy: { createdAt: "asc" },
        select: { status: true, message: true, createdAt: true },
      },
    },
  });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(submission, { headers: { "Cache-Control": "no-store" } });
}
