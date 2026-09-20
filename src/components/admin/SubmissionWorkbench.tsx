"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { completeSubmissionAction, failSubmissionAction } from "@/actions/admin";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";

function Submit({
  label,
  variant = "primary" as const,
}: {
  label: string;
  variant?: "primary" | "danger";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "Working…" : label}
    </Button>
  );
}

function Feedback({ state }: { state: { error?: string; success?: string } | null }) {
  if (state?.error) return <Alert tone="error">{state.error}</Alert>;
  if (state?.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

const FILE_INPUT =
  "block w-full text-sm text-ink-soft file:mr-4 file:rounded-pill file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700";

export function CompleteForm({
  submissionId,
  defaults,
}: {
  submissionId: string;
  defaults: {
    similarityScore: number | null;
    aiScore: number | null;
    wordCount: number | null;
    pageCount: number | null;
    adminNote: string | null;
    hasSimilarityReport: boolean;
  };
}) {
  const [state, action] = useActionState(completeSubmissionAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="submissionId" value={submissionId} />
      <Feedback state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Similarity score (%)" htmlFor="sim">
          <Input
            id="sim"
            name="similarityScore"
            type="number"
            min={0}
            max={100}
            step="0.1"
            required
            defaultValue={defaults.similarityScore ?? ""}
          />
        </Field>
        <Field label="AI writing score (%)" htmlFor="ai">
          <Input
            id="ai"
            name="aiScore"
            type="number"
            min={0}
            max={100}
            step="0.1"
            required
            defaultValue={defaults.aiScore ?? ""}
          />
        </Field>
        <Field label="Word count" hint="Optional" htmlFor="words">
          <Input
            id="words"
            name="wordCount"
            type="number"
            min={0}
            defaultValue={defaults.wordCount ?? ""}
          />
        </Field>
        <Field label="Page count" hint="Optional" htmlFor="pages">
          <Input
            id="pages"
            name="pageCount"
            type="number"
            min={0}
            defaultValue={defaults.pageCount ?? ""}
          />
        </Field>
      </div>

      <Field
        label="Similarity report PDF"
        hint={
          defaults.hasSimilarityReport
            ? "A report is already attached. Choosing a file replaces it."
            : "Required. PDF only."
        }
        htmlFor="sim-file"
      >
        <input
          id="sim-file"
          name="similarityReport"
          type="file"
          accept="application/pdf"
          className={FILE_INPUT}
        />
      </Field>

      <Field
        label="AI writing report PDF"
        hint="Optional — attach if you have a separate file."
        htmlFor="ai-file"
      >
        <input
          id="ai-file"
          name="aiReport"
          type="file"
          accept="application/pdf"
          className={FILE_INPUT}
        />
      </Field>

      <Field
        label="Note to the user"
        hint="Optional — shown on their report page."
        htmlFor="note"
      >
        <Textarea
          id="note"
          name="adminNote"
          rows={3}
          defaultValue={defaults.adminNote ?? ""}
        />
      </Field>

      <Submit label="Publish reports" />
    </form>
  );
}

export function FailForm({ submissionId }: { submissionId: string }) {
  const [state, action] = useActionState(failSubmissionAction, null);
  const [open, setOpen] = useState(false);

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-medium text-oxblood hover:underline"
      >
        <AlertTriangle className="h-4 w-4" />
        Mark as failed and refund
      </button>
    );

  return (
    <form
      action={action}
      className="space-y-4 rounded-xl2 border border-oxblood/30 bg-oxblood/10 p-5"
    >
      <input type="hidden" name="submissionId" value={submissionId} />
      <Feedback state={state} />

      <p className="text-sm text-oxblood">
        The user sees this reason and their credit is refunded automatically.
      </p>

      <Field label="Reason" htmlFor="fail-reason">
        <Textarea
          id="fail-reason"
          name="reason"
          rows={3}
          required
          placeholder="The uploaded file was corrupted and could not be read."
        />
      </Field>

      <div className="flex gap-2">
        <Submit label="Confirm failure" variant="danger" />
        <Button type="button" variant="ghost" size="md" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
