import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/site/AuthShell";
import { RegisterForm } from "@/components/site/AuthForms";
import { getCurrentUser } from "@/lib/auth";
import { ROLE } from "@/lib/types";

// Reads the database per request. Without this Next tries to prerender at
// build time, when no database exists yet, and the build fails.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === ROLE.ADMIN ? "/admin" : "/dashboard");

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to join. Your first check is included."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
