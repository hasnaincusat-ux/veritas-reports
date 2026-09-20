import { redirect } from "next/navigation";
import { AnnouncementBar } from "@/components/app/AnnouncementBar";
import { TopNav, type Tab } from "@/components/app/TopNav";
import { logoutAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { ROLE } from "@/lib/types";

// Reads the database per request. Without this Next tries to prerender at
// build time, when no database exists yet, and the build fails.
export const dynamic = "force-dynamic";

function tabsFor(user: { featureShareLinks: boolean; featureApi: boolean }): Tab[] {
  return [
    { href: "/dashboard", label: "Check", exact: true },
    { href: "/dashboard/submissions", label: "My documents" },
    // Only customers an admin has switched these on for ever see the tabs.
    ...(user.featureShareLinks
      ? [{ href: "/dashboard/links", label: "Share links" }]
      : []),
    ...(user.featureApi ? [{ href: "/dashboard/api", label: "API" }] : []),
    { href: "/dashboard/credits", label: "Credits" },
    { href: "/dashboard/settings", label: "Account" },
  ];
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <AnnouncementBar cta={{ href: "/dashboard/settings", label: "Learn more" }}>
        Checks run in no-repository mode: nothing you upload is indexed, reused, or
        visible to anyone but you.
      </AnnouncementBar>

      <TopNav
        tabs={tabsFor(user)}
        user={{ name: user.name, email: user.email, credits: user.credits }}
        logout={logoutAction}
        isAdmin={user.role === ROLE.ADMIN}
      />

      <main className="shell py-8">{children}</main>
    </div>
  );
}
