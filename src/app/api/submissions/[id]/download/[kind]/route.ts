import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";
import { resolveAccess } from "@/lib/submission-access";

type Kind = "similarity" | "ai" | "source";

/**
 * Files are served through this handler rather than from a public directory so
 * every download is authorised. Owners, API keys and share-link recipients get
 * the reports; only admins get the original upload.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  const { id, kind } = await params;

  const { access } = await resolveAccess(id, req);
  // Missing and forbidden look identical so ids cannot be probed.
  if (!access) return new NextResponse("Not found", { status: 404 });

  const submission = await db.submission.findUnique({
    where: { id },
    select: {
      reference: true,
      fileName: true,
      mimeType: true,
      storagePath: true,
      similarityReportPath: true,
      aiReportPath: true,
    },
  });
  if (!submission) return new NextResponse("Not found", { status: 404 });

  let key: string | null = null;
  let filename = "";
  let contentType = "application/pdf";

  switch (kind as Kind) {
    case "similarity":
      key = submission.similarityReportPath;
      filename = `${submission.reference}-similarity-report.pdf`;
      break;
    case "ai":
      key = submission.aiReportPath;
      filename = `${submission.reference}-ai-report.pdf`;
      break;
    case "source":
      if (access.kind !== "admin") return new NextResponse("Not found", { status: 404 });
      key = submission.storagePath;
      filename = submission.fileName;
      contentType = submission.mimeType || "application/octet-stream";
      break;
    default:
      return new NextResponse("Unknown file", { status: 400 });
  }

  if (!key) return new NextResponse("That file is not available yet", { status: 404 });

  let data: Buffer;
  try {
    data = await readStoredFile(key);
  } catch {
    // Most often the 7-day retention sweep has already removed the source file.
    return new NextResponse("That file is no longer available", { status: 410 });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(data.byteLength),
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
