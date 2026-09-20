import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Coins, Link2, Send, CheckCheck } from "lucide-react";
import { Card } from "@/components/ui";
import {
  CreateLinkForm,
  LinkList,
  LinksEmpty,
  PartnerNameForm,
} from "@/components/app/ShareLinksPanel";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { shareLinkUrl } from "@/lib/share-links";

export const metadata: Metadata = { title: "Share links" };
export const dynamic = "force-dynamic";

export default async function ShareLinksPage() {
  const user = await requireUser();
  // Feature is per-customer; anyone else who types the URL goes home.
  if (!user.featureShareLinks) redirect("/dashboard");

  const links = await db.shareLink.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const active = links.filter((l) => l.status === "ACTIVE").length;
  const issued = links.reduce(
    (n, l) => n + (l.status === "CANCELLED" ? l.used : l.allocated),
    0,
  );
  const used = links.reduce((n, l) => n + l.used, 0);

  const stats = [
    { label: "Credits available", value: user.credits, icon: Coins },
    { label: "Active links", value: active, icon: Link2 },
    { label: "Checks handed out", value: issued, icon: Send },
    { label: "Checks used", value: used, icon: CheckCheck },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Share links</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Hand out checks without handing out your login
        </h1>
        <p className="mt-1.5 max-w-2xl text-ink-soft">
          Load a link with a set number of checks and send it on. Whoever opens it uploads
          straight away — no account, no sign-in — and you see every result here.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-4 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl2 bg-brand-50 text-brand-600">
              <s.icon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <dt className="truncate text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                {s.label}
              </dt>
              <dd className="font-display text-2xl font-semibold tabular-nums">
                {s.value}
              </dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="space-y-6">
          <Card className="space-y-4 p-6">
            <div>
              <h2 className="text-lg font-bold">Create a link</h2>
            </div>
            <CreateLinkForm credits={user.credits} />
          </Card>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">
              Your links{" "}
              <span className="text-sm font-semibold text-ink-faint">{links.length}</span>
            </h2>
            {links.length === 0 ? (
              <LinksEmpty />
            ) : (
              <LinkList links={links.map((l) => ({ ...l, url: shareLinkUrl(l.code) }))} />
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24">
          <Card className="space-y-2 p-5">
            <h2 className="font-bold">Your name on links</h2>
            <PartnerNameForm current={user.partnerName} fallback={user.name} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
