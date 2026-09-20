"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, FileText, Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import { createSubmissionAction } from "@/actions/submissions";
import { Alert, Button, Field, Input } from "@/components/ui";
import { ExclusionSettings } from "./ExclusionSettings";
import { ACCEPTED_MIME, MAX_FILE_BYTES } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";

const ACCEPT = Object.values(ACCEPTED_MIME).join(",");

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={disabled || pending}
      className="w-full sm:w-auto sm:px-10"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading…
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Start check — 1 credit
        </>
      )}
    </Button>
  );
}

/** The main event on the Check tab: a large drop target plus the report filters. */
export function UploadForm({ credits }: { credits: number }) {
  const [state, action] = useActionState(createSubmissionAction, null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const noCredits = credits < 1;

  // Validate in the browser too so an oversized file is rejected before it is
  // pushed over the wire; the server repeats every check regardless.
  function accept(next: File | null) {
    setLocalError(null);
    if (!next) return setFile(null);
    if (next.size > MAX_FILE_BYTES) {
      setLocalError("That file is larger than the 100 MB limit.");
      return setFile(null);
    }
    if (!ACCEPTED_MIME[next.type]) {
      setLocalError("Upload a PDF, Word, PowerPoint or .txt file.");
      return setFile(null);
    }
    setFile(next);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0] ?? null;
    if (dropped && inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(dropped);
      inputRef.current.files = dt.files;
    }
    accept(dropped);
  }

  function clear() {
    setFile(null);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <form action={action} className="space-y-6">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {localError ? <Alert tone="error">{localError}</Alert> : null}
      {noCredits ? (
        <Alert tone="warning">
          <span className="inline-flex items-center gap-2 font-bold">
            <AlertTriangle className="h-3.5 w-3.5" />
            You are out of credits.
          </span>{" "}
          Uploading is paused until an administrator tops up your balance.
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* ---------------------------------------------------------- dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex min-h-[19rem] flex-col items-center justify-center rounded-xl3 border-2 border-dashed p-8 text-center transition-colors",
            dragging ? "border-brand-600 bg-brand-50" : "border-brand-200 bg-brand-50/50",
          )}
        >
          <input
            ref={inputRef}
            id="file"
            name="file"
            type="file"
            accept={ACCEPT}
            required
            className="sr-only"
            onChange={(e) => accept(e.target.files?.[0] ?? null)}
          />

          {file ? (
            <>
              <span className="grid h-16 w-16 place-items-center rounded-xl3 bg-brand-600 text-mint">
                <FileText className="h-8 w-8" strokeWidth={1.7} />
              </span>
              <p className="mt-4 max-w-full break-words px-2 text-lg font-bold">
                {file.name}
              </p>
              <p className="mt-0.5 text-sm text-ink-faint">
                {formatBytes(file.size)} · ready
              </p>
              <button
                type="button"
                onClick={clear}
                className="mt-4 inline-flex items-center gap-1.5 rounded-pill border border-ink/15 bg-surface px-4 py-1.5 text-xs font-semibold transition-colors hover:border-ink/30"
              >
                <X className="h-3.5 w-3.5" />
                Choose a different file
              </button>
            </>
          ) : (
            <>
              <span className="grid h-20 w-20 place-items-center rounded-xl3 bg-brand-600 text-mint shadow-glow">
                <UploadCloud className="h-10 w-10" strokeWidth={1.6} />
              </span>
              <p className="mt-5 text-2xl font-bold tracking-tight">Drop your document</p>
              <p className="mt-1.5 text-sm text-ink-soft">
                PDF, DOC, DOCX, PPT, PPTX or TXT · up to 100 MB
              </p>
              <label
                htmlFor="file"
                className="mt-5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:bg-brand-700 active:scale-[.98]"
              >
                <UploadCloud className="h-4 w-4" />
                Browse files
              </label>
              <p className="mt-3 text-xs text-ink-faint">
                or drop it anywhere in this box
              </p>
            </>
          )}
        </div>

        {/* ---------------------------------------------------------- settings */}
        <div className="space-y-5">
          <Field
            label="Label this check"
            hint="Optional — we use the filename if you leave it blank."
            htmlFor="title"
          >
            <Input
              id="title"
              name="title"
              maxLength={120}
              placeholder="Chapter 3 — final draft"
            />
          </Field>

          <ExclusionSettings />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-ink/10 pt-5">
        <Submit disabled={noCredits || !file} />
        <p className="text-xs leading-relaxed text-ink-faint">
          Checked in no-repository mode · your file is erased after seven days.
        </p>
      </div>
    </form>
  );
}
