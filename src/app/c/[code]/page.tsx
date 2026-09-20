import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { GuestUploadForm } from "@/components/app/GuestUploadForm";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Check a document" };
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "Veritas Reports";

/**
 * Public landing for a share link. Carries the partner's name, not ours, so
 * the person who received the link sees who sent it.
 */
export default async function ShareLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const link = await db.shareLink.findUnique({
    where: { code },
    select: {
      id: true,
      label: true,
      allocated: true,
      used: true,
      status: true,
      owner: {
        select: { name: true, partnerName: true, status: true, featureShareLinks: true },
      },
    },
  });

  const usable =
    link &&
    link.status === "ACTIVE" &&
    link.owner.status === "ACTIVE" &&
    link.owner.featureShareLinks;
  const left = link ? link.allocated - link.used : 0;
  const from = link?.owner.partnerName || link?.owner.name || SITE;

  return (
    <main className="min-h-screen bg-cream px-4 py-12 sm:py-20">
      <div className="mx-auto max-w-xl space-y-8">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-pill bg-surface px-3.5 py-1.5 text-xs font-bold text-brand-600 shadow-soft ring-1 ring-inset ring-ink/10">
            <ShieldCheck className="h-3.5 w-3.5" />
            Shared by {from}
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {usable ? "Check your document" : "This link is not active"}
          </h1>
          <p className="mt-2 text-ink-soft">
            {usable
              ? `Similarity and AI-writing reports, usually back within minutes. ${left} check${left === 1 ? "" : "s"} left on this link.`
              : "It may have been used up or cancelled. Ask whoever sent it to you for a new one."}
          </p>
        </header>

        {usable ? (
          <div className="card p-7">
            <GuestUploadForm code={code} />
          </div>
        ) : null}

        <p className="text-center text-xs text-ink-faint">
          Your file is checked in no-repository mode and erased after seven days. Powered
          by {SITE}.
        </p>
      </div>
    </main>
  );
}
