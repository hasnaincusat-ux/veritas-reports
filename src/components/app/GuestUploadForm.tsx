"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { guestUploadAction } from "@/actions/links";
import { Alert, Button, Field, Input } from "@/components/ui";
import { ExclusionSettings } from "./ExclusionSettings";
import { ACCEPTED_MIME, MAX_FILE_BYTES } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";

const ACCEPT = Object.values(ACCEPTED_MIME).join(",");

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={disabled || pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
        </>
      ) : (
        <>
          <UploadCloud className="h-4 w-4" /> Check this document
        </>
      )}
    </Button>
  );
}

export function GuestUploadForm({ code }: { code: string }) {
  const [state, action] = useActionState(guestUploadAction.bind(null, code), null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <form action={action} className="space-y-4">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {localError ? <Alert tone="error">{localError}</Alert> : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-xl3 border-2 border-dashed p-7 text-center transition-colors",
          dragging ? "border-brand-600 bg-brand-50" : "border-brand-200 bg-brand-50/40",
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
          <div className="flex items-center gap-4 text-left">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl2 bg-brand-600 text-mint">
              <FileText className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{file.name}</p>
              <p className="text-sm text-ink-faint">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="grid h-9 w-9 place-items-center rounded-pill text-ink-faint hover:bg-surface hover:text-ink"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl3 bg-brand-600 text-mint shadow-glow">
              <UploadCloud className="h-7 w-7" strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-lg font-bold">Drop your document here</p>
            <p className="mt-1 text-sm text-ink-soft">
              PDF, DOC, DOCX, PPT, PPTX · up to 100 MB
            </p>
            <label
              htmlFor="file"
              className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-pill bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-brand-700"
            >
              Browse files
            </label>
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Your name"
          hint="Optional — helps whoever sent you this link."
          htmlFor="guestName"
        >
          <Input id="guestName" name="guestName" maxLength={60} placeholder="Priya" />
        </Field>
        <Field label="Document title" hint="Optional." htmlFor="title">
          <Input
            id="title"
            name="title"
            maxLength={120}
            placeholder="Dissertation chapter 2"
          />
        </Field>
      </div>

      <ExclusionSettings />

      <Submit disabled={!file} />

      <p className="text-center text-xs leading-relaxed text-ink-faint">
        Save the page you land on next — it is the only way back to your result.
      </p>
    </form>
  );
}
