import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { Badge, EmptyState, Input } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const query = ((await searchParams).q ?? "").trim();

  const users = await db.user.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
            { phone: { contains: query } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      credits: true,
      createdAt: true,
      _count: { select: { submissions: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1.5 text-ink-soft">Manage credits, roles and account access.</p>
      </header>

      <form className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search name, email or phone…"
          className="pl-11"
        />
      </form>

      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" strokeWidth={1.3} />}
          title="No users found"
          body="Nobody matches that search."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl2 border border-ink/10 bg-surface">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="border-b border-ink/10 bg-cream text-left">
              <tr className="text-xs uppercase tracking-wider text-ink-faint">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 text-right font-medium">Checks</th>
                <th className="px-5 py-3 text-right font-medium">Credits</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-cream/60">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/users/${u.id}`} className="block">
                      <span className="font-medium text-brand-600 hover:underline">
                        {u.name}
                      </span>
                      <span className="block text-xs text-ink-faint">{u.email}</span>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-ink-soft">
                    {u._count.submissions}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold">{u.credits}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {u.role === "ADMIN" ? (
                        <Badge className="bg-brand-600 text-white ring-brand-600">
                          Admin
                        </Badge>
                      ) : null}
                      {u.status === "SUSPENDED" ? (
                        <Badge className="bg-oxblood/10 text-oxblood ring-oxblood/30">
                          Suspended
                        </Badge>
                      ) : (
                        <Badge className="bg-mint-faint text-brand-700 ring-mint-deep/40">
                          Active
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
