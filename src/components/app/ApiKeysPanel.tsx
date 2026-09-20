"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, Webhook } from "lucide-react";
import {
  generateApiKeyAction,
  revokeApiKeyAction,
  setWebhookAction,
} from "@/actions/api-keys";
import { Alert, Badge, Button, Field, Input } from "@/components/ui";
import { CopyButton } from "./CopyButton";
import { cn, formatDate, timeAgo } from "@/lib/utils";

function Submit({ label, size = "md" }: { label: string; size?: "sm" | "md" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size={size} disabled={pending}>
      {pending ? "Working…" : label}
    </Button>
  );
}

export function GenerateKeyForm() {
  const [state, action] = useActionState(generateApiKeyAction, null);

  return (
    <div className="space-y-4">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}

      {state?.plaintext ? (
        <div className="space-y-3 rounded-xl2 border border-highlight bg-highlight/15 p-4">
          <p className="text-sm font-bold">{state.success}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-xl2 bg-surface px-3 py-2 font-mono text-xs">
              {state.plaintext}
            </code>
            <CopyButton value={state.plaintext} label="Copy key" />
          </div>
        </div>
      ) : null}

      <form action={action} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field
          label="Key label"
          hint="Something you will recognise, like the server it lives on."
          htmlFor="label"
        >
          <Input
            id="label"
            name="label"
            required
            maxLength={60}
            placeholder="Production server"
          />
        </Field>
        <Button type="submit" className="h-12">
          <KeyRound className="h-4 w-4" />
          Generate key
        </Button>
      </form>
    </div>
  );
}

export type KeyRow = {
  id: string;
  label: string;
  prefix: string;
  status: string;
  usageCount: number;
  lastUsedAt: Date | null;
  webhookUrl: string | null;
  createdAt: Date;
};

function WebhookForm({ keyRow }: { keyRow: KeyRow }) {
  const [state, action] = useActionState(setWebhookAction, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="keyId" value={keyRow.id} />
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Webhook className="h-4 w-4 shrink-0 text-ink-faint" />
        <Input
          name="webhookUrl"
          type="url"
          defaultValue={keyRow.webhookUrl ?? ""}
          placeholder="https://your-app.example/hooks/checks  (optional — leave blank to poll)"
          className="h-10 min-w-[16rem] flex-1 text-sm"
        />
        <Submit label="Save" size="sm" />
      </div>
    </form>
  );
}

export function KeyList({ keys }: { keys: KeyRow[] }) {
  if (keys.length === 0)
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl3 border border-dashed border-ink/15 px-6 py-12 text-center">
        <KeyRound className="h-9 w-9 text-brand-300" strokeWidth={1.3} />
        <p className="font-bold">No keys yet</p>
        <p className="max-w-sm text-sm text-ink-soft">
          Generate one above. You will see the full key exactly once.
        </p>
      </div>
    );

  return (
    <ul className="space-y-3">
      {keys.map((k) => {
        const active = k.status === "ACTIVE";
        return (
          <li key={k.id} className={cn("card space-y-4 p-5", !active && "opacity-60")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{k.label}</p>
                <p className="font-mono text-xs text-ink-faint">{k.prefix}…</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    active
                      ? "bg-mint-faint text-brand-700 ring-mint-deep/40"
                      : "bg-ink/5 text-ink-faint ring-ink/15"
                  }
                >
                  {k.status.toLowerCase()}
                </Badge>
                {active ? (
                  <form
                    action={revokeApiKeyAction.bind(null, k.id)}
                    onSubmit={(e) => {
                      if (
                        !confirm(
                          `Revoke "${k.label}"? Anything using it will stop working immediately.`,
                        )
                      )
                        e.preventDefault();
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs font-semibold text-oxblood hover:underline"
                    >
                      Revoke
                    </button>
                  </form>
                ) : null}
              </div>
            </div>

            <p className="text-xs text-ink-faint">
              {k.usageCount.toLocaleString()} request{k.usageCount === 1 ? "" : "s"} ·{" "}
              {k.lastUsedAt ? `last used ${timeAgo(k.lastUsedAt)}` : "never used"} ·
              created {formatDate(k.createdAt)}
            </p>

            {active ? <WebhookForm keyRow={k} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
