import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/site/AuthShell";
import { LoginForm } from "@/components/site/AuthForms";
import { getCurrentUser } from "@/lib/auth";
import { ROLE } from "@/lib/types";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === ROLE.ADMIN ? "/admin" : "/dashboard");

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to upload a document or pick up a report."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-brand-600 hover:underline">
            Create one free
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
