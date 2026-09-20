import type { Metadata } from "next";
import { Coins } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CREDIT_REASON_LABEL, type CreditReason } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Credits" };
export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  const user = await requireUser();

  const transactions = await db.creditTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      delta: true,
      balanceAfter: true,
      reason: true,
      note: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Credits</h1>
        <p className="mt-1.5 text-ink-soft">
          One credit runs one check. Every change to your balance is listed here.
        </p>
      </header>

      <Card className="flex items-center gap-5 bg-brand-600 text-white">
        <span className="grid h-14 w-14 place-items-center rounded-xl3 bg-surface/10">
          <Coins className="h-7 w-7 text-emerald-500" strokeWidth={1.6} />
        </span>
        <div>
          <p className="text-sm text-brand-200">Current balance</p>
          <p className="text-4xl font-bold">{user.credits}</p>
        </div>
        <p className="ml-auto max-w-[14rem] text-right text-xs leading-relaxed text-brand-200">
          Need more? Contact an administrator to top up your account.
        </p>
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">History</h2>

        {transactions.length === 0 ? (
          <EmptyState
            icon={<Coins className="h-10 w-10" strokeWidth={1.3} />}
            title="No activity yet"
            body="Credit grants, charges and refunds will show up here."
          />
        ) : (
          <div className="overflow-hidden rounded-xl2 border border-ink/10 bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-ink/10 bg-cream text-left">
                <tr className="text-xs uppercase tracking-wider text-ink-faint">
                  <th className="px-5 py-3 font-medium">Activity</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 text-right font-medium">Change</th>
                  <th className="px-5 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium">
                        {CREDIT_REASON_LABEL[t.reason as CreditReason] ?? t.reason}
                      </p>
                      {t.note ? <p className="text-xs text-ink-faint">{t.note}</p> : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">
                      {formatDate(t.createdAt)}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-3.5 text-right font-semibold",
                        t.delta > 0 ? "text-mint" : "text-ink",
                      )}
                    >
                      {t.delta > 0 ? `+${t.delta}` : t.delta}
                    </td>
                    <td className="px-5 py-3.5 text-right text-ink-soft">
                      {t.balanceAfter}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
