import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { UploadForm } from "@/components/app/UploadForm";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "New check" };
export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">New check</h1>
        <p className="mt-1.5 text-ink-soft">
          One credit covers a similarity report and an AI-writing report. You have{" "}
          <span className="font-semibold text-ink">{user.credits}</span>.
        </p>
      </header>

      <Card className="p-7">
        <UploadForm credits={user.credits} />
      </Card>
    </div>
  );
}
