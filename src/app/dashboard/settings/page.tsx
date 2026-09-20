import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { PasswordForm, ProfileForm, ReviewForm } from "@/components/app/SettingsForms";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1.5 text-ink-soft">Member since {formatDate(user.createdAt)}.</p>
      </header>

      <Card className="space-y-5 p-7">
        <h2 className="font-semibold">Your details</h2>
        <ProfileForm name={user.name} email={user.email} phone={user.phone} />
      </Card>

      <Card className="space-y-5 p-7">
        <h2 className="font-semibold">Password</h2>
        <PasswordForm />
      </Card>

      <Card className="space-y-5 p-7">
        <div>
          <h2 className="font-semibold">Leave a review</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Reviews appear on the homepage once an administrator approves them.
          </p>
        </div>
        <ReviewForm />
      </Card>
    </div>
  );
}
