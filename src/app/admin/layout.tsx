import { redirect } from "next/navigation";
import { AppShell, type NavItem } from "@/components/app/AppShell";
import { AccountCard } from "@/components/app/AccountCard";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE } from "@/lib/types";

// Reads the database per request. Without this Next tries to prerender at
// build time, when no database exists yet, and the build fails.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // A signed-in non-admin is sent to their own dashboard rather than shown a
  // page that hints the admin area exists.
  if (user.role !== ROLE.ADMIN) redirect("/dashboard");

  const [queued, pendingReviews, newMessages] = await Promise.all([
    db.submission.count({ where: { status: { in: ["QUEUED", "PROCESSING"] } } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
  ]);

  const nav: NavItem[] = [
    { href: "/admin", label: "Overview", icon: "dashboard" },
    { href: "/admin/queue", label: "Queue", icon: "queue", badge: queued },
    { href: "/admin/submissions", label: "All checks", icon: "inbox" },
    { href: "/admin/users", label: "Users", icon: "users" },
    { href: "/admin/reviews", label: "Reviews", icon: "star", badge: pendingReviews },
    { href: "/admin/messages", label: "Messages", icon: "message", badge: newMessages },
  ];

  return (
    <AppShell
      rootHref="/admin"
      nav={nav}
      header={
        <AccountCard
          name={user.name}
          email={user.email}
          meta={
            <div className="rounded-xl2 bg-brand-600 px-3.5 py-2 text-center text-xs font-semibold text-emerald-500">
              Administrator
            </div>
          }
        />
      }
    >
      {children}
    </AppShell>
  );
}
