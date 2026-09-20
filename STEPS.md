# Going live — step by step

Everything on your computer is done. Your code is on GitHub already:
**https://github.com/hasnaincusat-ux/veritas-reports** (private)

What's left is clicking through **one website: railway.app**. It takes about 15
minutes. Follow these in order and don't skip step 4.

---

## Step 1 — Make a Railway account

1. Go to **https://railway.app**
2. Click **Login** → **Login with GitHub**
3. Approve the permission screen

Railway is free to start; this app costs roughly **$5/month** once running.

---

## Step 2 — Create the project from your code

1. Click **New Project**
2. Choose **Deploy from GitHub repo**
3. If asked, click **Configure GitHub App** and give Railway access to
   `veritas-reports`
4. Pick **veritas-reports**

It will start building. **It will fail this first time** — that is expected,
because there's no database yet. Carry on.

---

## Step 3 — Add the database

1. In your project, click **+ New** (top right)
2. Choose **Database** → **Add PostgreSQL**

Wait for it to go green. You now have two boxes: your app and a database.

---

## Step 4 — Add the disk ⚠️ DO NOT SKIP

This is where customers' uploaded documents and finished reports get stored.
Without it, **every report is deleted every time you deploy**.

1. Click your **app** box (not the database)
2. Go to **Settings** tab
3. Scroll to **Volumes** → click **New Volume**
4. Mount path — type exactly:

```
/data
```

5. Click **Add**

---

## Step 5 — Fill in the settings

1. Still on your app box, go to the **Variables** tab
2. Click **New Variable** and add each of these, one at a time.

| Name | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — type it exactly, including the braces |
| `AUTH_SECRET` | a long random string — see note below **(never commit this)** |
| `STORAGE_DIR` | `/data/storage` |
| `NEXT_PUBLIC_SITE_NAME` | your brand name, e.g. `Veritas Reports` |
| `SUBMISSION_PROVIDER` | `manual` |

> **Getting your `AUTH_SECRET`:** ask for one in chat, or run
> `openssl rand -base64 48` in your terminal. It signs everyone's login
> session. Paste it straight into Railway — never into a file in this repo.

Leave `NEXT_PUBLIC_SITE_URL` for now — you'll add it in step 6 once you know
your address.

---

## Step 6 — Get your web address

1. App box → **Settings** tab → **Networking**
2. Click **Generate Domain**
3. Copy the address it gives you, something like
   `veritas-reports-production.up.railway.app`
4. Go back to **Variables** and add one more:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://` + the address you just copied, **no slash at the end** |

Railway redeploys itself. Wait for the app box to turn green.

**Open the address in your browser — your site is live.**

---

## Step 7 — Create your admin account

The site is up, but nobody can log in yet. One command from your computer.

1. In Railway, click the **Postgres** box → **Variables** tab
2. Find **`DATABASE_PUBLIC_URL`** and copy it
3. On your computer, open a terminal in the project folder and run this,
   pasting your URL in place of `PASTE_URL_HERE`, and choosing your own email
   and password:

```bash
DATABASE_URL="PASTE_URL_HERE" ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="pick-a-strong-password" npm run setup:admin
```

It prints the account it created. **Go to `https://your-address/login` and sign
in.** You're the admin.

---

## Step 8 — Check it actually works

Do this properly, it takes two minutes and catches the one thing most likely to
be wrong:

1. Sign in as your admin
2. Go to **Users**, click your own account, add yourself some credits
3. Go to **Check**, upload any Word or PDF file
4. Go to **Admin → Queue**, open the job, download the original file

**If the download works, your disk is set up correctly.** If it fails, step 4
was missed.

---

## From now on

To put changes live, just save your work and run:

```bash
git add -A
git commit -m "describe what you changed"
git push
```

Railway sees the push and redeploys automatically. That's it.

---

## Two things still missing before you charge money

- **Payments** — there's no checkout. You add credits by hand in the admin panel.
- **Email** — nobody is emailed when their report is ready, and there's no
  "forgot password". If a customer is locked out, you have to fix it yourself.

Tell me when you want either of those and I'll build it.
