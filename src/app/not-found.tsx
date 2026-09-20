import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div className="max-w-md space-y-5">
        <p className="text-7xl font-bold text-brand-600">404</p>
        <h1 className="text-2xl font-bold tracking-tight">We cannot find that page</h1>
        <p className="text-ink-soft">
          The link may be out of date, or the item may belong to another account.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <ButtonLink href="/">Go home</ButtonLink>
          <ButtonLink href="/dashboard" variant="outline">
            My dashboard
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
