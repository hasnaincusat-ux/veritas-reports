import type { Submission } from "@prisma/client";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

/** The public shape of a check. Snake_case, stable, no internal ids leaked. */
export function serializeCheck(s: Submission) {
  const done = s.status === "COMPLETED";
  return {
    check_id: s.id,
    reference: s.reference,
    title: s.title,
    file_name: s.fileName,
    status: s.status.toLowerCase(),
    similarity_score: s.similarityScore,
    ai_score: s.aiScore,
    word_count: s.wordCount,
    page_count: s.pageCount,
    failure_reason: s.failureReason,
    exclusions: {
      bibliography: s.excludeBibliography,
      quotes: s.excludeQuotes,
      small_matches:
        s.smallMatchMode === "OFF"
          ? null
          : { mode: s.smallMatchMode.toLowerCase(), value: s.smallMatchValue },
    },
    created_at: s.createdAt.toISOString(),
    completed_at: s.completedAt?.toISOString() ?? null,
    reports: done
      ? {
          similarity: s.similarityReportPath
            ? `${BASE}/api/submissions/${s.id}/download/similarity`
            : null,
          ai: s.aiReportPath ? `${BASE}/api/submissions/${s.id}/download/ai` : null,
        }
      : null,
  };
}
