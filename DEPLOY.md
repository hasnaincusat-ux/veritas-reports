# Deploying

**If you just want the site live, follow [STEPS.md](STEPS.md)** — it is the
same thing written for someone who has not deployed before. This file is the
reference: what the pieces are and why.

## Storage: read this first

`src/lib/storage.ts` has **two backends behind one interface**, chosen at
startup by a single environment variable:

| `S3_BUCKET` | Backend                      | Use                             |
| ----------- | ---------------------------- | ------------------------------- |
| set         | S3-compatible object storage | production, any host            |
| empty       | local disk (`STORAGE_DIR`)   | development and the test suites |

Nothing outside that file knows which is in use.

This is what makes serverless hosting possible. On Vercel, Netlify or Lambda
the filesystem is recreated per request and wiped on redeploy, so a report
written to disk is already gone by the time the customer clicks download. With
`S3_BUCKET` set, nothing touches the disk.

Any S3-compatible service works — Supabase Storage, Cloudflare R2, Backblaze
B2, AWS S3, MinIO. **Supabase Storage is the recommended default**: it is free,
needs no payment method, and it is the same account as the database.

> **Cloudflare R2** is also excellent and has a generous free tier, but it
> requires a payment method on file before it can be enabled.

Verify a backend before trusting it:

```bash
npm run test:storage                      # local disk
STORAGE_TEST_S3=1 npm run test:storage    # object storage
```

The S3 run stands up a throwaway in-process server that speaks enough of the
protocol to exercise the real AWS SDK, real request signing and real HTTP —
so it catches wiring mistakes that a mock of our own code would not.

## 1. Database

The schema is `postgresql` for **every** environment, so local and production
behave identically. Supabase and Neon both have a free tier.

On a serverless host you **must** use a pooled connection string — Supabase's
**Transaction pooler** (port 6543, with `?pgbouncer=true`) or Neon's pooled
endpoint. Each serverless invocation opens its own connection; the direct
string exhausts the connection limit under real traffic.

```bash
DATABASE_URL="<pooled url>" npx prisma db push
```

> A pre-existing `prisma/dev.db` is SQLite and is **not** migrated.
> `prisma/seed.ts` recreates the admin; `scripts/seed-demo.ts` recreates the
> sample customer. Never run the latter against production.

## 2. Environment variables

| Variable                                    | Notes                                                       |
| ------------------------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`                              | pooled Postgres URL                                         |
| `AUTH_SECRET`                               | a **fresh** 32+ char secret — `openssl rand -base64 48`     |
| `NEXT_PUBLIC_SITE_URL`                      | `https://your-domain.com`, no trailing slash                |
| `S3_BUCKET`                                 | set this to use object storage                              |
| `S3_ENDPOINT`                               | omit only for real AWS S3, which derives it from the region |
| `S3_REGION`                                 | `auto` for R2; the project's region for Supabase            |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` |                                                             |
| `STORAGE_DIR`                               | disk backend only; ignored when `S3_BUCKET` is set          |
| `NEXT_PUBLIC_SITE_NAME`                     | brand name                                                  |
| `SUBMISSION_PROVIDER`                       | `manual`                                                    |

The repo is **public**. Secrets go in the host's environment settings and
nowhere else. Never reuse a development `AUTH_SECRET` — changing it signs
everyone out, which is the correct behaviour if it is ever exposed.

## 3. Hosting

**Vercel** is the default target: import the GitHub repo, set the variables
above, deploy. Build is `npm run build`, which runs `prisma generate` first.

A host with a persistent volume (Railway, Render, Fly, a VPS) also works and
can skip the `S3_*` variables entirely by mounting a disk and setting
`STORAGE_DIR`. That is no longer the recommended path — it costs money and
buys nothing the object-storage backend does not already give you.

## 4. The bucket must be private

Files are **never** served from the bucket directly. Every download goes
through `/api/submissions/[id]/download/[kind]`, which checks ownership first.
A public bucket would make every customer's document reachable by anyone who
guessed a key, bypassing that check entirely.

## 5. Retention sweep

The 7-day purge does not run itself. Schedule it daily — a Vercel Cron, a
GitHub Action, or any scheduler that can run:

```bash
npm run purge
```

It deletes **source documents only**; generated reports are kept. Until this
runs on a schedule, the "deleted after 7 days" promise on the marketing page
is not being kept.

## 6. Domain

Add the custom domain in the host's dashboard, then set `NEXT_PUBLIC_SITE_URL`
to the real origin and redeploy, so share links resolve correctly.

---

## Before you take real money

Ranked by how much they would hurt.

1. **No payments.** Credits are granted by hand in the admin panel.
2. **No transactional email.** Nobody is told their report is ready, and
   password reset has schema fields but no flow — a locked-out customer needs
   you to fix it by hand.
3. **No API rate limiting.** Keys are authenticated and tenant-isolated, but a
   leaked key can be hammered.
4. **Backups.** Check what your database provider retains on the free tier, and
   whether the bucket is versioned. Reports live in the bucket.
5. **Uptime and errors.** No monitoring. A 500 loop would be invisible to you.

## Health check after each deploy

```bash
curl -s -o /dev/null -w "home %{http_code}\n"  https://your-domain.com/
curl -s -o /dev/null -w "login %{http_code}\n" https://your-domain.com/login
curl -s -o /dev/null -w "api %{http_code}\n"   https://your-domain.com/api/v1/checks
```

Expect `200`, `200`, `401`. Then sign in as admin and **upload one real
document and download it again** — storage is the part most likely to be
misconfigured, and only a real round trip proves it.
