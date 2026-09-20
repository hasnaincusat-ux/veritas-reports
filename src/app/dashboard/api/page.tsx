import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Coins, KeyRound, Terminal } from "lucide-react";
import { Card } from "@/components/ui";
import { GenerateKeyForm, KeyList } from "@/components/app/ApiKeysPanel";
import { CopyButton } from "@/components/app/CopyButton";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORIGIN } from "@/lib/types";

export const metadata: Metadata = { title: "API" };
export const dynamic = "force-dynamic";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

const SAMPLE = `# 1. Submit a document (one credit)
curl -X POST ${BASE}/api/v1/checks \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -F "file=@essay.docx" \\
  -F "title=Essay draft 2"
# → 202 { "check_id": "…", "status": "queued", … }

# 2. Poll until status is "completed"
curl ${BASE}/api/v1/checks/CHECK_ID \\
  -H "Authorization: Bearer YOUR_KEY"
# → { "status": "completed", "similarity_score": 11.4, "ai_score": 3.2,
#     "reports": { "similarity": "…/download/similarity", "ai": "…/download/ai" } }

# 3. Download a report (same header)
curl -L -o similarity.pdf ${BASE}/api/submissions/CHECK_ID/download/similarity \\
  -H "Authorization: Bearer YOUR_KEY"`;

export default async function ApiPage() {
  const user = await requireUser();
  if (!user.featureApi) redirect("/dashboard");

  const [keys, viaApi] = await Promise.all([
    db.apiKey.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "desc" } }),
    db.submission.count({ where: { userId: user.id, origin: ORIGIN.API } }),
  ]);

  const stats = [
    { label: "Credits available", value: user.credits, icon: Coins },
    {
      label: "Active keys",
      value: keys.filter((k) => k.status === "ACTIVE").length,
      icon: KeyRound,
    },
    { label: "Checks via API", value: viaApi, icon: Terminal },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">API</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Run checks from your own software
        </h1>
        <p className="mt-1.5 max-w-2xl text-ink-soft">
          Send a file, get a check id, poll for the result or let us call your webhook.
          Each check costs one credit from this account.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="space-y-6">
          <Card className="space-y-4 p-6">
            <h2 className="text-lg font-bold">Generate a key</h2>
            <GenerateKeyForm />
          </Card>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">
              Your keys{" "}
              <span className="text-sm font-semibold text-ink-faint">{keys.length}</span>
            </h2>
            <KeyList keys={keys} />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Quick start</h2>
              <CopyButton value={SAMPLE} label="Copy" />
            </div>
            <pre className="overflow-x-auto rounded-xl2 bg-brand-800 p-4 text-[11px] leading-relaxed text-brand-100">
              <code>{SAMPLE}</code>
            </pre>
            <p className="text-xs leading-relaxed text-ink-faint">
              Call from your server, never from a browser — anyone who can read the key
              can spend your credits. Errors come back as{" "}
              <code className="font-mono">{"{ error: { code, message } }"}</code>; a{" "}
              <code className="font-mono">402</code> means the account is out of credits.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
