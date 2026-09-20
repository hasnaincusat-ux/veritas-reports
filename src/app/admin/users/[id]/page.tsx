import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { SubmissionRow } from "@/components/app/submission";
import { CreditAdjustForm, ConfirmButton } from "@/components/admin/UserControls";
import {
  setUserFeatureAction,
  setUserRoleAction,
  setUserStatusAction,
} from "@/actions/admin";
import { FeatureToggles } from "@/components/admin/FeatureToggles";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { CREDIT_REASON_LABEL, type CreditReason } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireAdmin();

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      credits: true,
      createdAt: true,
      featureShareLinks: true,
      featureApi: true,
      partnerName: true,
      _count: { select: { shareLinks: true, apiKeys: true } },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          reference: true,
          title: true,
          fileSize: true,
          status: true,
          similarityScore: true,
          aiScore: true,
          createdAt: true,
        },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          delta: true,
          balanceAfter: true,
          reason: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });
  if (!user) notFound();

  const isSelf = user.id === admin.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        All users
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {user.name}
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            {user.email}
            {user.phone ? ` · ${user.phone}` : null} · joined {formatDate(user.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          {user.role === "ADMIN" ? (
            <Badge className="bg-brand-600 text-white ring-brand-600">Admin</Badge>
          ) : null}
          {user.status === "SUSPENDED" ? (
            <Badge className="bg-oxblood/10 text-oxblood ring-oxblood/30">
              Suspended
            </Badge>
          ) : (
            <Badge className="bg-mint-faint text-brand-700 ring-mint-deep/40">
              Active
            </Badge>
          )}
        </div>
      </header>

      <Card className="flex items-center gap-5 bg-brand-600 text-white">
        <div>
          <p className="text-sm text-brand-200">Credit balance</p>
          <p className="text-4xl font-bold">{user.credits}</p>
        </div>
      </Card>

      <Card className="space-y-5 p-7">
        <h2 className="font-semibold">Adjust credits</h2>
        <CreditAdjustForm userId={user.id} />
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-semibold">Account controls</h2>
        {isSelf ? (
          <p className="text-sm text-ink-faint">
            You cannot change your own role or suspend your own account.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            <ConfirmButton
              action={setUserRoleAction.bind(
                null,
                user.id,
                user.role === "ADMIN" ? "USER" : "ADMIN",
              )}
              label={user.role === "ADMIN" ? "Revoke admin" : "Make admin"}
              confirm={
                user.role === "ADMIN"
                  ? `Remove admin access from ${user.name}?`
                  : `Give ${user.name} full admin access?`
              }
            />
            <ConfirmButton
              action={setUserStatusAction.bind(
                null,
                user.id,
                user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
              )}
              label={
                user.status === "SUSPENDED" ? "Reactivate account" : "Suspend account"
              }
              confirm={
                user.status === "SUSPENDED"
                  ? `Reactivate ${user.name}?`
                  : `Suspend ${user.name}? They will be signed out and unable to log in.`
              }
              variant={user.status === "SUSPENDED" ? "outline" : "danger"}
            />
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-6">
        <div>
          <h2 className="font-semibold">Features</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Extra tools this customer can use. Everyone starts with none.
          </p>
        </div>
        <FeatureToggles
          userId={user.id}
          flags={{ shareLinks: user.featureShareLinks, api: user.featureApi }}
          counts={{ shareLinks: user._count.shareLinks, api: user._count.apiKeys }}
          toggle={setUserFeatureAction}
        />
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recent checks</h2>
        {user.submissions.length === 0 ? (
          <p className="text-sm text-ink-faint">
            This user has not submitted anything yet.
          </p>
        ) : (
          <div className="space-y-3">
            {user.submissions.map((s) => (
              <SubmissionRow
                key={s.id}
                submission={s}
                href={`/admin/submissions/${s.id}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Credit history</h2>
        {user.transactions.length === 0 ? (
          <p className="text-sm text-ink-faint">No credit activity yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl2 border border-ink/10 bg-surface">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-ink/5">
                {user.transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium">
                        {CREDIT_REASON_LABEL[t.reason as CreditReason] ?? t.reason}
                      </p>
                      {t.note ? <p className="text-xs text-ink-faint">{t.note}</p> : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-ink-soft">
                      {formatDate(t.createdAt)}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-3 text-right font-semibold",
                        t.delta > 0 ? "text-mint" : "text-ink",
                      )}
                    >
                      {t.delta > 0 ? `+${t.delta}` : t.delta}
                    </td>
                    <td className="px-5 py-3 text-right text-ink-soft">
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
