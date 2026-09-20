import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- Button */

type ButtonVariant = "primary" | "soft" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-glow hover:bg-brand-700",
  soft: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-100",
  outline: "border border-ink/15 bg-surface text-ink hover:border-ink/30 hover:bg-cream",
  ghost: "text-ink-soft hover:bg-ink/5 hover:text-ink",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
};

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 active:scale-[.98]";

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(BUTTON_BASE, VARIANTS[variant], SIZES[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ----------------------------------------------------------------- Field */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-oxblood">{error}</p>
      ) : hint ? (
        <p className="text-sm text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

const CONTROL =
  "w-full rounded-xl2 border border-ink/15 bg-surface px-4 text-[15px] text-ink placeholder:text-ink-faint transition-colors focus:border-brand-500 disabled:bg-ink/5";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(CONTROL, "h-12", className)} {...props} />;
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(CONTROL, "py-3 leading-relaxed", className)}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(CONTROL, "h-12 pr-10", className)} {...props} />;
});

/* ------------------------------------------------------------ Badge/Card */

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("card p-6", className)}>{children}</div>;
}

export function Alert({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success" | "warning";
  children: React.ReactNode;
}) {
  const tones = {
    info: "bg-brand-50 text-brand-800 border-brand-200",
    error: "bg-oxblood/10 text-oxblood border-oxblood/30",
    success: "bg-mint-faint text-brand-700 border-mint-deep/40",
    warning: "bg-amber-400/10 text-amber-200 border-amber-400/50/30",
  };
  return (
    <div
      className={cn("rounded-xl2 border px-4 py-3 text-sm", tones[tone])}
      role="status"
    >
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl3 border border-dashed border-ink/15 px-6 py-14 text-center">
      {icon ? <div className="text-brand-300">{icon}</div> : null}
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-sm text-ink-soft">{body}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

/** Small labelled figure used across the dashboards. */
export function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "brand";
}) {
  return (
    <div className="rounded-xl2 border border-ink/10 bg-surface p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "brand" ? "text-brand-500" : "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}
