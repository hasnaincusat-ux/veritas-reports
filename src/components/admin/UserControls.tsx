"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { adjustCreditsAction } from "@/actions/admin";
import { Alert, Button, Field, Input, Select } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Applying…" : "Apply"}
    </Button>
  );
}

export function CreditAdjustForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(adjustCreditsAction, null);
  const [direction, setDirection] = useState("grant");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />

      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Action" htmlFor="direction">
          <Select
            id="direction"
            name="direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="grant">Add credits</option>
            <option value="revoke">Remove credits</option>
          </Select>
        </Field>

        <Field label="Amount" htmlFor="amount">
          <Input
            id="amount"
            name="amount"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={1}
          />
        </Field>
      </div>

      <Field
        label="Note"
        hint="Optional — shown to the customer in their credit history."
        htmlFor="note"
      >
        <Input
          id="note"
          name="note"
          maxLength={120}
          placeholder="Paid via bank transfer"
        />
      </Field>

      <Submit />
    </form>
  );
}

/**
 * Role and suspension are one-click but destructive enough to warrant a
 * confirm, so a misclick cannot lock someone out.
 */
export function ConfirmButton({
  action,
  label,
  confirm,
  variant = "outline",
}: {
  action: () => Promise<void>;
  label: string;
  confirm: string;
  variant?: "outline" | "danger";
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      <Button type="submit" variant={variant} size="sm">
        {label}
      </Button>
    </form>
  );
}
