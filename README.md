# Veritas Reports

A similarity & AI-writing report service: customers upload a document, spend a
credit, and get back two PDF reports. Operators work a queue in an admin panel.

`Veritas Reports` is a placeholder brand — change `NEXT_PUBLIC_SITE_NAME` in
`.env` and the whole site follows.

## Stack

Next.js 16 (App Router, server actions) · TypeScript · Tailwind · Prisma.

The database is **Postgres everywhere** — development included — so local and
production behave identically. The schema deliberately avoids enums and `Json`
columns, which is what made the move off SQLite a one-line change.

Point `DATABASE_URL` at any Postgres instance (Supabase and Neon both have a
free tier) and run `npx prisma db push`. On a serverless host, use the
provider's **pooled** connection string — each invocation opens its own
connection and the direct one runs out under real traffic.

## Running it

```bash
npm install
npx prisma db push
npx tsx prisma/seed.ts        # creates the admin account, prints its password
npm run dev
```

Seed the sample customer and submissions (optional, but makes the UI worth
looking at):

```bash
npx tsx --conditions=react-server scripts/seed-demo.ts
```

That creates `demo@example.com` / `demo-account-2026` with six submissions
covering every status, plus contact messages and a pending review.

> The `--conditions=react-server` flag is needed for any script that imports
> from `src/lib` — those modules are marked `server-only`.

### Environment

| Variable                                    | Purpose                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`                              | Postgres connection string — pooled, on a serverless host                        |
| `AUTH_SECRET`                               | Session signing key — **must** be 32+ chars. Generate a fresh one for production |
| `S3_BUCKET`                                 | Set it to store files in object storage instead of on disk                       |
| `S3_ENDPOINT` / `S3_REGION`                 | Omit the endpoint only for real AWS S3                                           |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Object storage credentials                                                       |
| `STORAGE_DIR`                               | Disk backend only — ignored when `S3_BUCKET` is set                              |
| `NEXT_PUBLIC_SITE_NAME`                     | Brand name shown in the logo, titles and footer                                  |
| `SUBMISSION_PROVIDER`                       | `manual` (default) or `lti`                                                      |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`            | Read by the seed script only                                                     |

## Design system

**Light SaaS**, adopted from a QuoteKit (Lovable) template the owner supplied.
Near-white ground `#F8FAFC`, white cards with hairline grey borders, indigo
primary `#3F5BD9` with a pale indigo accent for icon tiles and active nav.
**DM Sans** body, **Plus Jakarta Sans** headings, JetBrains Mono for readings.
8–12px radii, soft shadows.

Only the template's _design_ was taken. Its codebase (Vite SPA + Supabase +
shadcn) was deliberately not adopted — porting the credit ledger, share links,
API keys and admin panel onto Supabase RLS would have cost far more than the UI
kit is worth.

**Restyling is a token swap.** `brand-*`, `mint`, `sky`, `plum` and friends keep
their names in `tailwind.config.ts`, so changing their values restyles every
component at once. Two things to know:

- `cream` is the page ground and `ink` is foreground text. These inverted during
  a dark-theme phase and are now back to their literal meaning, so
  `border-ink/10` is a grey hairline again.
- Scores carry **two independent signals**: `METRICS` colours the ring and label
  to say _which_ reading it is (similarity = indigo, AI = violet), while
  `scoreBand` colours the figure to say how serious it is (green → amber → red).
  Keep those ramps disjoint or the two signals start lying to each other.

### The homepage hero

`src/components/site/HeroDemo.tsx` renders **two pages of a Turnitin report as
an alternating stack**, reproduced from real reports the owner supplied:

- **Integrity Overview** — `26% Overall Similarity`, Filtered from the Report,
  Match Groups (Not Cited or Quoted / Missing Quotations / Missing Citation /
  Cited and Quoted, each a tinted icon square with count, label, % and note),
  Top Sources by database, Integrity Flags beside the pale-blue advisory box.
- **AI Writing Overview** — `*% detected as AI` with the false-positive
  explanation, the "Caution: Review required" box, and the full disclaimer.

Both carry the running header **and** footer the real report repeats on every
page (mark, `Page N of M - <section>`, `Submission ID trn:oid:::…`). The front
sheet swaps every 5.2s; either sheet can be clicked to bring it forward, and
dots below show which is on top. `prefers-reduced-motion` stops the rotation.

> **Trademark note.** At the owner's explicit direction this renders Turnitin's
> wordmark and `trn:oid` identifiers verbatim, so the hero shows the delivered
> artefact exactly as customers receive it. That is trademark use: it is
> defensible as depicting a product being resold, and the footer disclaims
> affiliation, but it is the owner's commercial risk and not a neutral default.
> An earlier revision used this site's own mark and a `VR-` reference — revert
> to that if the positioning ever changes.

Content lives in `MATCH_GROUPS`, `TOP_SOURCES`, `SUBMISSION_ID` and the two
`*Body` components at the top of the file.

> Deleting a component that Tailwind has already scanned makes the dev server
> throw `ENOENT … resolveChangedFiles` from `globals.css` until you
> `rm -rf .next`. Restarting alone does not clear it.

## Report filters (exclusions)

Every upload carries the Turnitin-style exclusions that decide what counts
toward the similarity score:

| Filter                | Default                                  |
| --------------------- | ---------------------------------------- |
| Exclude bibliography  | on                                       |
| Exclude quoted text   | on                                       |
| Exclude small matches | off — or under N words / under N percent |

They are chosen on the Check tab, on a share link's public page, and via the
API (same field names: `excludeBibliography`, `excludeQuotes`,
`smallMatchMode`, `smallMatchValue`). `parseExclusions` clamps the threshold
(1–1000 words, 1–100 percent) and falls back to OFF on anything unparseable,
so a hand-rolled API call cannot store nonsense.

The choices are **restated wherever a score appears** — the customer's report,
the recipient's result page, the API response, and most importantly the admin
workbench, where the operator must set the same exclusions in Turnitin before
generating the report. A similarity figure is not interpretable without them.

## Where files live

`src/lib/storage.ts` has **two backends behind one interface**, picked at
startup by whether `S3_BUCKET` is set:

- **Object storage** (S3 / Supabase Storage / R2 / B2) — production. Required
  on serverless hosts, where the filesystem is recreated per request and wiped
  on redeploy, so a report written to disk is gone before it can be downloaded.
- **Local disk** — development and the test suites, so neither needs a cloud
  account or credentials.

Only `saveFile`, `readStoredFile` and `deleteStoredFile` are exported, and
nothing outside that file knows which backend is in use.

**The bucket must be private.** Files are never served from it directly; every
download goes through an ownership check in
`/api/submissions/[id]/download/[kind]`. A public bucket bypasses that check
for anyone who guesses a key.

Keys are generated here and never taken from user input, and `isSafeKey`
rejects traversal, absolute paths, backslashes and drive letters — so a
tampered database value still cannot reach another customer's file. The check
is string-based rather than path-based on purpose: the same key has to be
refused identically on both backends, and an S3 key has no filesystem to
resolve against.

## How a check flows

1. Customer uploads a file on the Check tab (`/dashboard`), picking the report
   filters. Type and size are validated in the browser and again on the server.
2. The file is stored, a submission row is created, then **one credit is
   charged**. If the charge fails, the row and the file are removed — no orphans.
3. The configured `SubmissionProvider` is dispatched. If it throws, the credit
   is refunded automatically and the check is marked `FAILED`.
4. The job appears in the admin queue. An operator downloads the original, runs
   it through their own Turnitin account, then enters the scores and attaches
   the report PDFs.
5. Publishing flips the status to `COMPLETED` and the customer can download.
   Their page is polling, so it updates without a manual refresh.

Cancelling a queued check, or an operator marking one failed, both refund the
credit in the same transaction that closes the submission.

## The provider layer

The app never talks to Turnitin directly — it talks to a `SubmissionProvider`
(`src/lib/providers/`). Two are registered:

- **`manual`** (shipping) — the job lands in the admin queue for a human.
- **`lti`** (stub) — deliberately throws. Implement `submit()` to build the
  tool-launch deep link from `assignment_trn` + `tii_template_id`, then
  `poll()` / `fetchReport()` to drive the job to completion with no operator
  involved. Nothing outside that one file needs to change.

## Security notes

- Passwords are bcrypt (cost 12). Sessions are signed JWTs in an httpOnly,
  `sameSite=lax` cookie; `secure` is set automatically in production.
- Login returns one message for every failure mode, so the form can't be used to
  enumerate which emails have accounts.
- Suspending a user invalidates their live session on the next request.
- **Files are never served statically.** Every download goes through
  `/api/submissions/[id]/download/[kind]`, which checks ownership. The original
  upload is admin-only; customers can only fetch their own reports. A submission
  belonging to someone else returns 404, not 403, so ids can't be probed.
- Storage keys are generated server-side and re-validated against the storage
  root on every read, so a tampered database value still can't escape it.
- Credit spending uses a conditional `updateMany` guarded on
  `credits >= amount`, so concurrent requests can't oversell a balance. There is
  a test for exactly this.

## Retention

Uploads carry a `purgeAfter` date seven days out. Run the sweep on a schedule:

```bash
npx tsx --conditions=react-server scripts/purge-expired.ts
```

It deletes **source documents only** — generated reports are kept so customers
don't lose them.

## Tests

```bash
npm run dev                                       # in one terminal
npx tsx --conditions=react-server scripts/selftest.ts
```

33 checks covering the credit ledger (including the concurrent double-spend
race), the upload pipeline and its unwind paths, storage path-traversal
refusal, and every HTTP auth guard.

```bash
npx tsx --conditions=react-server scripts/selftest-features.ts
```

54 checks on share links, API and report filters: reservation/refund
accounting, the one-check race, guest token access, key hashing, tenant
isolation, revocation, feature-flag enforcement over HTTP, and exclusion
parsing/clamping/persistence.

Neither of those needs a cloud account, because they run against the local-disk
storage backend. The storage layer itself has its own suite, which runs the same
assertions against **both** backends so they are proven to behave identically:

```bash
npm run test:storage                      # local disk      — 20 checks
STORAGE_TEST_S3=1 npm run test:storage    # object storage  — 22 checks
```

The object-storage run stands up a throwaway in-process server that speaks
enough of the protocol to exercise the real AWS SDK, real request signing and
real HTTP, so it catches wiring mistakes that a mock of our own code would not.
It needs no credentials and touches no network beyond localhost.

> After any `prisma/schema.prisma` change, restart `npm run dev`. The dev
> server keeps the old generated client in memory and every DB call will 500
> until it does.

## Per-customer features

Two extra tools exist. **Both are off for everyone by default** and an admin
switches them on per customer from `/admin/users/[id]` → Features. A customer
without the flag never sees the tab, and the underlying routes redirect or
return 401 if reached directly. Switching a flag off takes effect on the
customer's next request — live API keys stop working immediately.

### Share Links (`/dashboard/links`)

A customer loads a link with N checks and sends it to someone else. The checks
are **moved out of their balance the moment the link is created** (ledger
reason `LINK_RESERVE`) and the unused remainder comes back on cancel
(`LINK_REFUND`). Recipients open `/c/{code}`, upload with no account, and land
on `/c/{code}/{id}?t=…` — the token in that URL is their only credential, so
the page warns them to bookmark it. The customer sees every result in their own
document list, tagged with the recipient's name.

Claiming a check off a link is a conditional `updateMany`, so a one-check link
opened by three people at once lets exactly one through. There is a test.

### API access (`/dashboard/api`)

Bearer keys, `vr_live_…`, shown in full exactly once and stored as a SHA-256
hash. `POST /api/v1/checks` (multipart `file`, optional `title`) charges one
credit and returns `202` with a `check_id`; `GET /api/v1/checks/{id}` polls it
and carries report download URLs once complete; `GET /api/v1/checks` lists.
Optional per-key webhook receives `check.completed` / `check.failed` — one
attempt, 8 s timeout, polling is the fallback. Errors are
`{ error: { code, message } }`; `402` means out of credits.

## Not built yet

> Capabilities worth having, described in our own terms. Names, wording,
> pricing tiers and screen layouts should be ours — a competitor's feature set
> is fair to match, their branding and copy is not.

### Partner Workspaces (time-boxed client access)

Access sold by period rather than per check. A purchase creates one private,
password-gated workspace for one client for a fixed term; the partner never
handles that client's contact or payment details. Needs a `Workspace` model
with term start/end, its own auth, and partner-level branding (display name,
support address, logo).

Pick our own term lengths and prices — do not mirror a competitor's tier table.

### Rate limiting on the API

Keys are authenticated and tenant-isolated but not throttled. Add per-key
limits before exposing this publicly.

### Deliberately not planned: an "AI humanizer"

The reference product bundles a tool that rewrites text to defeat AI-writing
detection. That is built for passing AI work off as your own, which is the
opposite of what the rest of this product is for, and it would undercut the
"check your own draft honestly" positioning the whole site rests on. Left out
unless you decide otherwise.

### 4. Everything else

- **Payments.** Credits are granted by an admin. The ledger already models
  everything a gateway would need, so adding Paystack (M-Pesa, Airtel, cards)
  means one webhook that calls `grantCredits()`. Also: credit bundles and
  redeem-codes.
- **Multi-file upload.** The dropzone takes one file; the reference accepts a
  batch.
- **Word-count gate.** The 300–30,000-word rule for AI reports is shown as
  guidance but not enforced server-side — that needs real text extraction.
- **Email.** No welcome, receipt or "report ready" mail, and no email
  verification. Password reset has schema fields (`resetToken`,
  `resetTokenExpiry`) but no flow, since it needs email to be useful.
- **Rate limiting** on login and the contact form.

## Legal

This is an independent product. It does not use Turnitin's name, logo or
branding, and the footer says plainly that it isn't affiliated with Turnitin
LLC. Keep it that way — presenting the site as Turnitin would be trademark
infringement and would put the domain at risk.
