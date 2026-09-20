import type { Metadata } from "next";
import { Mail, MessageSquare } from "lucide-react";
import { Badge, Button, EmptyState } from "@/components/ui";
import { setMessageStatusAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  NEW: "bg-amber-400/15 text-ink ring-amber-400/40",
  READ: "bg-brand-50 text-brand-600 ring-brand-200",
  ARCHIVED: "bg-ink/5 text-ink-soft ring-ink/15",
};

export default async function AdminMessagesPage() {
  await requireAdmin();

  const messages = await db.contactMessage.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const unread = messages.filter((m) => m.status === "NEW").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-1.5 text-ink-soft">
          {unread === 0
            ? "No new messages."
            : `${unread} new message${unread > 1 ? "s" : ""} from the contact form.`}
        </p>
      </header>

      {messages.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-10 w-10" strokeWidth={1.3} />}
          title="No messages"
          body="Enquiries sent from the homepage contact form land here."
        />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <article key={m.id} className="card space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{m.subject}</p>
                  <p className="text-xs text-ink-faint">
                    {m.name} · {m.email} · {formatDate(m.createdAt, true)}
                  </p>
                </div>
                <Badge className={TONE[m.status]}>{m.status.toLowerCase()}</Badge>
              </div>

              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                {m.message}
              </p>

              <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 pt-4">
                <a
                  href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}
                  className="inline-flex items-center gap-2 rounded-pill bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Reply by email
                </a>

                {m.status === "NEW" ? (
                  <form action={setMessageStatusAction.bind(null, m.id, "READ")}>
                    <Button type="submit" size="sm" variant="outline">
                      Mark as read
                    </Button>
                  </form>
                ) : null}
                {m.status !== "ARCHIVED" ? (
                  <form action={setMessageStatusAction.bind(null, m.id, "ARCHIVED")}>
                    <Button type="submit" size="sm" variant="ghost">
                      Archive
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
