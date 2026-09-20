# Deploying

## Read this first: why not Vercel

`src/lib/storage.ts` writes uploaded documents and report PDFs to a **directory
on disk**. Vercel's filesystem is ephemeral — anything written during a request
is gone on the next one, and everything is wiped on redeploy. Deployed there,
this app would accept uploads and then serve `410 Gone` for every download.

So you need **either**:

- a host with a **persistent volume** — Railway, Render, Fly, or any VPS. Works
  with zero code changes. This is the fast path, and what this guide covers.
- **or** object storage (S3 / Cloudflare R2 / Supabase Storage) wired into
  `src/lib/storage.ts` first — after which Vercel is fine. That is a contained
  change: `saveFile`, `readStoredFile` and `deleteStoredFile` are the only three
  functions that touch the disk.

Everything below uses **Railway**, because it gives you the app, Postgres and a
volume in one project. Render and Fly are near-identical in shape.

---

## 1. Database

The schema is now `postgresql` for **every** environment, so local and
production behave identically.

Create a free Postgres at [neon.tech](https://neon.tech) (or use Railway's).
Take two connection strings:

| Use | Where |
| --- | --- |
| a **development** branch | your local `.env` |
| the **main** branch | Railway's `DATABASE_URL` |

Point your local `.env` at the dev branch and run:

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

> Your existing `prisma/dev.db` is SQLite and is **not** migrated. The seed
> recreates the admin; `scripts/seed-demo.ts` recreates the sample customer.

## 2. Push to GitHub

The repo is already initialised and committed, with `.env` and `*.db` ignored.

```bash
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```

## 3. Create the Railway project

1. **New Project → Deploy from GitHub repo** → pick the repo.
2. Railway detects Next.js. Confirm the commands are:
   - Build: `npm run build`  (this already runs `prisma generate`)
   - Start: `npm start`
3. **+ New → Database → Postgres** if you are not using Neon.

## 4. Add the persistent volume — do not skip this

In the service: **Settings → Volumes → New Volume**, mount path `/data`.

Then set `STORAGE_DIR=/data/storage`. Without a volume, every redeploy destroys
customers' reports.

## 5. Environment variables

Service → **Variables**:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | your Postgres URL (use Railway's `${{Postgres.DATABASE_URL}}` if hosted there) |
| `AUTH_SECRET` | a **fresh** 32+ char secret — `openssl rand -base64 48` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com`, no trailing slash |
| `STORAGE_DIR` | `/data/storage` |
| `NEXT_PUBLIC_SITE_NAME` | your brand name |
| `SUBMISSION_PROVIDER` | `manual` |

Never reuse the development `AUTH_SECRET`. Changing it later signs everyone out,
which is the correct behaviour if it is ever exposed.

## 6. First deploy, then initialise

Deploy. Once it is up, run once against the **production** database — either
from Railway's shell or locally with `DATABASE_URL` pointed at production:

```bash
npx prisma db push          # create the tables
ADMIN_EMAIL=you@your-domain.com ADMIN_PASSWORD='<a strong password>' \
  npx tsx prisma/seed.ts    # create the admin
```

Do **not** run `scripts/seed-demo.ts` against production — it creates a fake
customer with sample submissions.

## 7. Domain

Service → **Settings → Networking → Custom Domain**. Add the CNAME Railway
gives you at your registrar. Then set `NEXT_PUBLIC_SITE_URL` to the real origin
and redeploy, so share links resolve correctly.

## 8. Schedule the retention sweep

The 7-day purge does not run itself. Add a Railway **Cron** service on the same
repo and volume, daily:

```bash
npx tsx --conditions=react-server scripts/purge-expired.ts
```

Until this runs on a schedule, the "deleted after 7 days" promise on the
marketing page is not actually being kept.

---

## Before you take real money

Ranked by how much they would hurt.

1. **No payments.** Credits are granted by hand in the admin panel. Until a
   gateway is wired in, every sale is manual.
2. **No transactional email.** Nobody is told their report is ready, and
   password reset has schema fields but no flow — a locked-out customer needs
   you to fix it by hand.
3. **No API rate limiting.** Keys are authenticated and tenant-isolated, but a
   leaked key can be hammered.
4. **Backups.** Neon and Railway Postgres both snapshot, but the **volume** may
   not be. Reports live there.
5. **Uptime and errors.** No monitoring. A 500 loop would be invisible to you.

## Health check after each deploy

```bash
curl -s -o /dev/null -w "home %{http_code}\n"  https://your-domain.com/
curl -s -o /dev/null -w "login %{http_code}\n" https://your-domain.com/login
curl -s -o /dev/null -w "api %{http_code}\n"   https://your-domain.com/api/v1/checks
```

Expect `200`, `200`, `401`. Then sign in as admin and upload one real document
end to end — the storage volume is the part most likely to be misconfigured,
and only a real upload proves it.
