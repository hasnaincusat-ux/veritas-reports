"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sendContactMessageAction } from "@/actions/public";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Sending…" : "Send message"}
    </Button>
  );
}

export function ContactForm() {
  const [state, action] = useActionState(sendContactMessageAction, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="c-name">
          <Input id="c-name" name="name" required placeholder="Jane Doe" />
        </Field>
        <Field label="Email address" htmlFor="c-email">
          <Input
            id="c-email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
          />
        </Field>
      </div>

      <Field label="Subject" htmlFor="c-subject">
        <Input
          id="c-subject"
          name="subject"
          required
          placeholder="Question about my report"
        />
      </Field>

      <Field label="Message" htmlFor="c-message">
        <Textarea
          id="c-message"
          name="message"
          required
          rows={5}
          placeholder="How can we help?"
        />
      </Field>

      <Submit />
    </form>
  );
}
