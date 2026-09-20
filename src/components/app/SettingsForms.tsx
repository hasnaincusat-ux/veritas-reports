"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Star } from "lucide-react";
import { useState } from "react";
import { changePasswordAction, updateProfileAction } from "@/actions/auth";
import { submitReviewAction } from "@/actions/public";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";

function Save({ label = "Save changes" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function Feedback({ state }: { state: { error?: string; success?: string } | null }) {
  if (state?.error) return <Alert tone="error">{state.error}</Alert>;
  if (state?.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

export function ProfileForm({
  name,
  email,
  phone,
}: {
  name: string;
  email: string;
  phone: string | null;
}) {
  const [state, action] = useActionState(updateProfileAction, null);

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />

      <Field label="Full name" htmlFor="p-name">
        <Input id="p-name" name="name" defaultValue={name} required />
      </Field>

      <Field
        label="Email address"
        hint="Contact support if you need to change this."
        htmlFor="p-email"
      >
        <Input id="p-email" value={email} disabled readOnly />
      </Field>

      <Field label="Phone number" htmlFor="p-phone">
        <Input id="p-phone" name="phone" type="tel" defaultValue={phone ?? ""} />
      </Field>

      <Save />
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, null);

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />

      <Field label="Current password" htmlFor="pw-current">
        <Input
          id="pw-current"
          name="current"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field label="New password" hint="At least 8 characters." htmlFor="pw-next">
        <Input
          id="pw-next"
          name="next"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Field label="Confirm new password" htmlFor="pw-confirm">
        <Input
          id="pw-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Save label="Update password" />
    </form>
  );
}

export function ReviewForm() {
  const [state, action] = useActionState(submitReviewAction, null);
  const [rating, setRating] = useState(5);

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />

      <input type="hidden" name="rating" value={rating} />

      <div className="space-y-1.5">
        <span className="block text-sm font-medium">Your rating</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={rating === n}
              className="rounded p-0.5"
            >
              <Star
                className={
                  n <= rating
                    ? "h-6 w-6 fill-amber-400 text-amber-400"
                    : "h-6 w-6 text-ink/20"
                }
              />
            </button>
          ))}
        </div>
      </div>

      <Field label="Your review" htmlFor="r-body">
        <Textarea
          id="r-body"
          name="body"
          rows={4}
          required
          placeholder="How did it go?"
        />
      </Field>

      <Save label="Submit review" />
    </form>
  );
}
