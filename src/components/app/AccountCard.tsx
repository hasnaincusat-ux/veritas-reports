import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";

export function AccountCard({
  name,
  email,
  meta,
}: {
  name: string;
  email: string;
  meta?: React.ReactNode;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-ink-faint">{email}</p>
        </div>
      </div>

      {meta}

      <form action={logoutAction}>
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-xl2 px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.8} />
          Sign out
        </button>
      </form>
    </div>
  );
}
