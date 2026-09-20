"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { loginAction, registerAction } from "@/actions/auth";
import { Alert, Button, Field, Input } from "@/components/ui";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Just a moment…" : label}
    </Button>
  );
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={shown ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center text-ink-faint transition-colors hover:text-ink"
        aria-label={shown ? "Hide password" : "Show password"}
      >
        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, null);

  return (
    <form action={action} className="space-y-5">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}

      <Field label="Email address" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Field>

      <Submit label="Sign in" />
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, null);

  return (
    <form action={action} className="space-y-5">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}

      <Field label="Full name" htmlFor="name">
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          placeholder="Jane Doe"
        />
      </Field>

      <Field label="Email address" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <Field
        label="Phone number"
        hint="Optional — only used if we need to reach you."
        htmlFor="phone"
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+254 700 000 000"
        />
      </Field>

      <Field label="Password" hint="At least 8 characters." htmlFor="password">
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="••••••••"
        />
      </Field>

      <Submit label="Create account" />

      <p className="text-center text-xs leading-relaxed text-ink-faint">
        Your first check is free. We only check documents you upload yourself.
      </p>
    </form>
  );
}
