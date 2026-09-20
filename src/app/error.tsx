"use client";

import { Button } from "@/components/ui";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div className="max-w-md space-y-5">
        <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="text-ink-soft">
          The page could not be loaded. Try again, and if it keeps happening let us know.
        </p>
        {error.digest ? (
          <p className="text-xs text-ink-faint">Reference: {error.digest}</p>
        ) : null}
        <div className="pt-2">
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </main>
  );
}
