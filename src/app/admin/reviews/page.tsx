import type { Metadata } from "next";
import { Star } from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/ui";
import { setReviewStatusAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  PENDING: "bg-amber-400/15 text-ink ring-amber-400/40",
  APPROVED: "bg-mint-faint text-brand-700 ring-mint-deep/40",
  REJECTED: "bg-ink/5 text-ink-soft ring-ink/15",
};

export default async function AdminReviewsPage() {
  await requireAdmin();

  const reviews = await db.review.findMany({
    // Pending first, then newest — the moderation work is always at the top.
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      name: true,
      rating: true,
      body: true,
      status: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  });

  const pending = reviews.filter((r) => r.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Reviews</h1>
        <p className="mt-1.5 text-ink-soft">
          {pending === 0
            ? "Nothing waiting for moderation."
            : `${pending} review${pending > 1 ? "s" : ""} waiting for approval.`}{" "}
          Approved reviews appear on the homepage.
        </p>
      </header>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star className="h-10 w-10" strokeWidth={1.3} />}
          title="No reviews yet"
          body="Customers can leave a review from their dashboard settings."
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <article key={r.id} className="card space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-ink-faint">
                    {r.user?.email ?? "no account"} · {formatDate(r.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex gap-0.5" aria-label={`${r.rating} out of 5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={
                          i < r.rating
                            ? "h-4 w-4 fill-amber-400 text-amber-400"
                            : "h-4 w-4 text-ink/20"
                        }
                      />
                    ))}
                  </span>
                  <Badge className={TONE[r.status]}>{r.status.toLowerCase()}</Badge>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-ink-soft">{r.body}</p>

              <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-4">
                {r.status !== "APPROVED" ? (
                  <form action={setReviewStatusAction.bind(null, r.id, "APPROVED")}>
                    <Button type="submit" size="sm">
                      Approve
                    </Button>
                  </form>
                ) : null}
                {r.status !== "REJECTED" ? (
                  <form action={setReviewStatusAction.bind(null, r.id, "REJECTED")}>
                    <Button type="submit" size="sm" variant="outline">
                      Reject
                    </Button>
                  </form>
                ) : null}
                {r.status !== "PENDING" ? (
                  <form action={setReviewStatusAction.bind(null, r.id, "PENDING")}>
                    <Button type="submit" size="sm" variant="ghost">
                      Reset to pending
                    </Button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
