# Going live — step by step

Everything on your computer is done. What's left is three free accounts and
about 30 minutes of clicking. **No credit card, nothing expires.**

| What                         | Who              | Cost |
| ---------------------------- | ---------------- | ---- |
| The website itself           | Vercel           | Free |
| The database                 | Supabase         | Free |
| Customers' files and reports | Supabase Storage | Free |

> **Why this changed.** The app used to write uploads to a hard disk, which
> meant paying for a server with a disk attached. It now writes them to cloud
> storage instead, so the whole thing runs on free hosting permanently.

---

## Step 0 — Set up a separate identity first ⚠️ DO THIS FIRST

This is a **client site**, so none of it should live in your personal
accounts. Mixing them causes three specific problems later:

- You cannot hand the site over without handing over your personal login
- The client's database sits next to your own projects, one misclick apart
- If you ever stop working with them, untangling it is painful

So before anything else, **make one new email address just for this client**
— a free Gmail is fine, e.g. `yourbrand.veritas@gmail.com`.

Every account below gets created with **that** email, using email-and-password
sign-up. Do **not** click "Continue with GitHub" anywhere in this guide — that
is what would tie it all back to your personal account.

> **Who should own these?** If the client is paying and this is their
> business, these accounts are ultimately theirs. Creating them on a dedicated
> address now means you can hand over the password later and be done. Putting
> them on your personal email means you are their hosting provider forever.

---

## Step 1 — Make the database (Supabase)

1. Go to **https://supabase.com** → **Start your project**
2. Choose **Sign up** and register with the **client email from step 0** and a
   new password — not GitHub
3. When it asks for an **organization**, create a new one named after the
   client. Do not reuse an existing one.
4. Click **New project**
5. Name it anything, e.g. `veritas`
6. **Write down the database password it asks you to set** — you cannot see it
   again later
7. Pick the region closest to your customers
8. Click **Create new project** and wait ~2 minutes

> If Supabase drops you into an organization you already had, stop and switch
> — the project must be created inside the new one.

---

## Step 2 — Copy the database address

1. Click **Connect** at the top of the page
2. Find the **Transaction pooler** string. It looks like:

```
postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
```

3. Replace `[YOUR-PASSWORD]` with the password from step 1
4. Add this to the very end: `?pgbouncer=true`

Keep it in a notepad. This is your **`DATABASE_URL`**.

> ⚠️ It must be the **Transaction pooler** one, port **6543**, with
> `?pgbouncer=true` on the end. The other connection string works on your
> computer but runs out of connections once the site is live.

---

## Step 3 — Make the file storage

1. In Supabase, click **Storage** in the left sidebar
2. Click **New bucket**, name it exactly:

```
documents
```

3. Leave it **Private** (important — customers' files must not be public)
4. Click **Save**

Now the keys:

5. Go to **Project Settings** (gear icon) → **Storage**
6. Find the **S3 Connection** section
7. Copy the **Endpoint** and the **Region** into your notepad
8. Click **New access key**, and copy both the **Access key ID** and the
   **Secret access key** into your notepad

> The secret is shown **once**. If you lose it, delete the key and make another.

---

## Step 4 — Create the tables

One command from your computer. Paste your `DATABASE_URL` in place of
`PASTE_URL_HERE`, keeping the quotes:

```bash
DATABASE_URL="PASTE_URL_HERE" npx prisma db push
```

It should print `Your database is now in sync with your Prisma schema.`

---

## Step 5 — Put the site online (Vercel)

1. Go to **https://vercel.com** → **Sign up**
2. Register with the **client email from step 0**, not GitHub
3. Vercel still needs to read the code, so when it asks, connect the GitHub
   account that holds the repo and **grant it access to `veritas-reports`
   only** — not to all your repositories
4. Click **Add New** → **Project**
5. Find **veritas-reports** in the list and click **Import**
6. **Do not click Deploy yet.** Open **Environment Variables** first.

> This is the one place the client's setup still touches your GitHub, because
> that is where the code lives. Scoping the permission to this single repo
> keeps it narrow. See "Handing it over" at the end for how to cut even that.

Add these one at a time. Name on the left, value on the right:

| Name                    | Value                                     |
| ----------------------- | ----------------------------------------- |
| `DATABASE_URL`          | the string from step 2                    |
| `AUTH_SECRET`           | a long random string — see the note below |
| `S3_BUCKET`             | `documents`                               |
| `S3_ENDPOINT`           | the Endpoint from step 3                  |
| `S3_REGION`             | the Region from step 3                    |
| `S3_ACCESS_KEY_ID`      | the Access key ID from step 3             |
| `S3_SECRET_ACCESS_KEY`  | the Secret access key from step 3         |
| `NEXT_PUBLIC_SITE_NAME` | your brand name                           |
| `SUBMISSION_PROVIDER`   | `manual`                                  |

> **Getting `AUTH_SECRET`:** ask me in chat and I'll generate one. It signs
> everyone's login session. Paste it straight into Vercel — **never** into a
> file in the repo, because the repo is public.

Leave `NEXT_PUBLIC_SITE_URL` out for now; it comes in step 6.

5. Now click **Deploy** and wait ~3 minutes.

---

## Step 6 — Tell the site its own address

Vercel gives you an address like `veritas-reports.vercel.app`.

1. Go to **Settings** → **Environment Variables**
2. Add one more:

| Name                   | Value                                              |
| ---------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | `https://` + your address, **no slash at the end** |

3. Go to the **Deployments** tab → click the **⋯** on the newest one →
   **Redeploy**

**Open your address in a browser — your site is live.**

---

## Step 7 — Create your admin account

The site is up but nobody can log in yet. One command, using the same
`DATABASE_URL`:

```bash
DATABASE_URL="PASTE_URL_HERE" ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="pick-a-strong-password" npm run setup:admin
```

Go to `https://your-address/login` and sign in. You're the admin.

---

## Step 8 — Prove it actually works ⚠️ DO NOT SKIP

This takes two minutes and catches the one thing most likely to be wrong.

1. Sign in as your admin
2. **Users** → click your own account → give yourself some credits
3. **Check** → upload any Word or PDF file
4. **Admin → Queue** → open the job → **download the original file**

**If that download works, your storage is wired up correctly.** If it fails,
one of the four `S3_*` variables in step 5 is wrong — check them character by
character, especially the secret.

---

## From now on

To put changes live:

```bash
git add -A
git commit -m "describe what you changed"
git push
```

Vercel sees the push and redeploys automatically. That's it.

---

## Handing it over later

Because everything is on one dedicated email, handover is: give the client
that email's password, and the Supabase and Vercel accounts go with it.

The **code** is the one loose end — the repo is under your GitHub account. When
the time comes, GitHub's **Settings → Transfer ownership** moves it to theirs,
and Vercel keeps deploying once they re-point it. Until then, nothing in the
running site depends on your personal account staying available.

> Worth deciding early whether the code is theirs or licensed to them. It is
> much easier to agree now than the day they ask for it.

---

## Two things to know about the free tiers

- **Supabase pauses a project after a week with no activity.** Once you have
  real customers this never happens. Before then, just open the site every few
  days, or click **Restore** in Supabase if it does pause.
- **The 7-day file deletion does not run by itself.** Set it up later with a
  Vercel Cron, or run `npm run purge` by hand. Until then the "deleted after
  7 days" line on your homepage isn't strictly true.

## Two things still missing before you charge money

- **Payments** — there's no checkout. You add credits by hand in the admin panel.
- **Email** — nobody is emailed when their report is ready, and there's no
  "forgot password". If a customer is locked out, you have to fix it yourself.

Tell me when you want either of those and I'll build it.
