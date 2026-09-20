import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Search } from "lucide-react";
import { EmptyState, Input } from "@/components/ui";
import { SubmissionRow } from "@/components/app/submission";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "All checks" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "", label: "All" },
  { key: "QUEUED", label: "Queued" },
  { key: "PROCESSING", label: "Processing" },
  { key: "COMPLETED", label: "Completed" },
  { key: "FAILED", label: "Failed" },
  { key: "CANCELLED", label: "Cancelled" },
];

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdmin();
  const { status, q } = await searchParams;
  const active = FILTERS.some((f) => f.key === status) ? status : "";
  const query = (q ?? "").trim();

  const submissions = await db.submission.findMany({
    where: {
      ...(active ? { status: active } : {}),
      ...(query
        ? {
            OR: [
              { reference: { contains: query } },
              { title: { contains: query } },
              { fileName: { contains: query } },
              { user: { email: { contains: query } } },
              { user: { name: { contains: query } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      reference: true,
      title: true,
      fileSize: true,
      status: true,
      similarityScore: true,
      aiScore: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">All checks</h1>
        <p className="mt-1.5 text-ink-soft">
          Every submission on the platform. Showing up to 100 most recent.
        </p>
      </header>

      <form className="relative">
        {active ? <input type="hidden" name="status" value={active} /> : null}
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search reference, title, filename, customer…"
          className="pl-11"
        />
      </form>

      <nav className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (f.key) params.set("status", f.key);
          if (query) params.set("q", query);
          const qs = params.toString();

          return (
            <Link
              key={f.key || "all"}
              href={qs ? `/admin/submissions?${qs}` : "/admin/submissions"}
              className={cn(
                "rounded-pill px-4 py-1.5 text-sm font-medium transition-colors",
                (active || "") === f.key
                  ? "bg-brand-600 text-white"
                  : "bg-surface text-ink-soft ring-1 ring-inset ring-ink/10 hover:text-ink",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {submissions.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10" strokeWidth={1.3} />}
          title="Nothing found"
          body="No submissions match the current filter or search."
        />
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <SubmissionRow
              key={s.id}
              submission={s}
              href={`/admin/submissions/${s.id}`}
              extra={s.user.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
