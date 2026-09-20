"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ExternalLink, Link2, MessageCircle, Plus } from "lucide-react";
import {
  cancelShareLinkAction,
  createShareLinkAction,
  updatePartnerNameAction,
} from "@/actions/links";
import { Alert, Badge, Button, Field, Input } from "@/components/ui";
import { CopyButton } from "./CopyButton";
import { cn, formatDate } from "@/lib/utils";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function Feedback({ state }: { state: { error?: string; success?: string } | null }) {
  if (state?.error) return <Alert tone="error">{state.error}</Alert>;
  if (state?.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

export function PartnerNameForm({
  current,
  fallback,
}: {
  current: string | null;
  fallback: string;
}) {
  const [state, action] = useActionState(updatePartnerNameAction, null);
  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <Field
        label="Name shown to people who open your links"
        hint={`Leave blank to show "${fallback}".`}
        htmlFor="partnerName"
      >
        <div className="flex gap-2">
          <Input
            id="partnerName"
            name="partnerName"
            defaultValue={current ?? ""}
            maxLength={60}
            placeholder={fallback}
          />
          <Submit label="Save" />
        </div>
      </Field>
    </form>
  );
}

export function CreateLinkForm({ credits }: { credits: number }) {
  const [state, action] = useActionState(createShareLinkAction, null);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
        <Field label="Checks" htmlFor="allocated">
          <Input
            id="allocated"
            name="allocated"
            type="number"
            min={1}
            max={Math.max(1, credits)}
            defaultValue={1}
            required
          />
        </Field>
        <Field label="Label — who is this for?" htmlFor="label">
          <Input
            id="label"
            name="label"
            required
            maxLength={80}
            placeholder="e.g. Priya — dissertation"
          />
        </Field>
        <Button type="submit" disabled={credits < 1} className="h-12">
          <Plus className="h-4 w-4" />
          Create link
        </Button>
      </div>
      <p className="text-xs text-ink-faint">
        The checks come off your balance now and sit inside the link. Cancel it any time
        to get the unused ones back.
      </p>
    </form>
  );
}

export type LinkRow = {
  id: string;
  code: string;
  label: string;
  allocated: number;
  used: number;
  status: string;
  createdAt: Date;
  url: string;
};

const TONE: Record<string, string> = {
  ACTIVE: "bg-mint-faint text-brand-700 ring-mint-deep/40",
  EXHAUSTED: "bg-ink/5 text-ink-soft ring-ink/15",
  CANCELLED: "bg-ink/5 text-ink-faint ring-ink/15",
};

export function LinkList({ links }: { links: LinkRow[] }) {
  if (links.length === 0) return null;

  return (
    <ul className="space-y-3">
      {links.map((l) => {
        const left = l.allocated - l.used;
        const pct = Math.round((l.used / l.allocated) * 100);
        const active = l.status === "ACTIVE";
        const wa = `https://wa.me/?text=${encodeURIComponent(
          `Here is your document check link (${left} check${left === 1 ? "" : "s"}): ${l.url}`,
        )}`;

        return (
          <li key={l.id} className={cn("card space-y-4 p-5", !active && "opacity-70")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{l.label}</p>
                <p className="text-xs text-ink-faint">
                  Created {formatDate(l.createdAt)}
                </p>
              </div>
              <Badge className={TONE[l.status] ?? TONE.CANCELLED}>
                {l.status.toLowerCase()}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-ink/10">
                <div
                  className="h-full rounded-pill bg-brand-600"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="shrink-0 text-sm tabular-nums">
                <span className="font-bold">{left}</span>
                <span className="text-ink-faint"> / {l.allocated} left</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-pill bg-cream px-3 py-1.5 font-mono text-xs">
                {l.url}
              </code>
              <CopyButton value={l.url} />
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-pill border border-ink/15 bg-surface px-3 py-1.5 text-xs font-semibold hover:border-ink/30"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-pill border border-ink/15 bg-surface px-3 py-1.5 text-xs font-semibold hover:border-ink/30"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
              {active ? (
                <form
                  action={cancelShareLinkAction.bind(null, l.id)}
                  onSubmit={(e) => {
                    if (
                      !confirm(
                        `Cancel "${l.label}" and return ${left} unused check${left === 1 ? "" : "s"}?`,
                      )
                    )
                      e.preventDefault();
                  }}
                  className="ml-auto"
                >
                  <button
                    type="submit"
                    className="text-xs font-semibold text-oxblood hover:underline"
                  >
                    Cancel link
                  </button>
                </form>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function LinksEmpty() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl3 border border-dashed border-ink/15 px-6 py-12 text-center">
      <Link2 className="h-9 w-9 text-brand-300" strokeWidth={1.3} />
      <p className="font-bold">No links yet</p>
      <p className="max-w-sm text-sm text-ink-soft">
        Create one above, send it to someone, and they can upload without an account.
      </p>
    </div>
  );
}
