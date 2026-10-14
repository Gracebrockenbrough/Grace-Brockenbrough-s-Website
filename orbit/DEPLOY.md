# Launch Orbit as a public website

When you're done, anyone can go to your web address, create an account with email and a password, and use Orbit. Each person's data is private to their account.

It takes about 15 minutes. You'll use two free services:

- **Supabase** stores accounts and each person's Orbit.
- **Vercel** puts the app on the internet.

You'll need the GitHub account that holds this repository.

## 1. Create the database (Supabase)

1. Go to [supabase.com](https://supabase.com), sign up, and click **New project**. Pick any name (for example "orbit"), set a database password (save it somewhere), choose the region closest to you, and create it. Setup takes a minute or two.
2. In the left sidebar, open **SQL Editor** → **New query**.
3. Open [`supabase/schema.sql`](supabase/schema.sql) in this repository, copy all of it, paste it into the editor, and click **Run**. You should see "Success". This creates the table and the rule that lets each person see only their own data.
4. Open **Project Settings** → **API** (in newer dashboards, **API Keys** and **Data API**). Copy two values:
   - the **Project URL** (looks like `https://abcd1234.supabase.co`)
   - the **publishable** key, also called the **anon public** key. Do **not** copy the service_role or secret key.
5. Optional: under **Authentication** → **Providers** → **Email**, you can turn off **Confirm email**. People can then start immediately instead of clicking a link first.

## 2. Put it online (Vercel)

1. Go to [vercel.com](https://vercel.com), sign up with GitHub, and click **Add New…** → **Project**.
2. Import this repository (`Grace-Brockenbrough-s-Website`). If it isn't listed, give Vercel access to it under **Adjust GitHub App Permissions**.
3. Before deploying, change two settings:
   - **Root Directory:** click **Edit** and choose `orbit`.
   - **Environment Variables:** add these two:

     | Name | Value |
     | --- | --- |
     | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL from step 1.4 |
     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your publishable (anon) key from step 1.4 |

4. Click **Deploy**. After a couple of minutes you'll get a web address like `orbit-yourname.vercel.app`.
5. Back in Supabase, open **Authentication** → **URL Configuration** and set **Site URL** to that address. This makes the confirmation and password-reset emails link back to your app.

Open your address, create an account, and you're in. Share the address with anyone.

**Branch:** Vercel deploys the repository's main branch by default. This work is on the branch `claude/wonderful-franklin-w7oex9`. Either merge it into main first, or under **Settings** → **Git** set the **Production Branch** to that branch.

## 3. Optional: turn on Orbit's AI

With an Anthropic API key, Ask Orbit answers open-ended questions, and "Add anything" can read photos and screenshots. Without a key, everything else still works and Ask uses its built-in answers.

1. Create a key at [console.anthropic.com](https://console.anthropic.com) → **API Keys**. Usage is billed to your Anthropic account.
2. In Vercel, open your project → **Settings** → **Environment Variables**. Add `ANTHROPIC_API_KEY` with the key as its value.
3. Go to **Deployments**, open the ⋯ menu on the latest one, and click **Redeploy**.

The key stays on the server. Only signed-in users can use the AI.

## Run it on your own computer

```bash
cd orbit
cp .env.example .env.local   # fill in the values, or leave them blank
npm install
npm run dev                  # http://localhost:3000
```

With the Supabase values left blank, Orbit runs without accounts and saves each person's data in their own browser.

## What's real and what isn't yet

- **Real:**
  - accounts and private storage
  - everything you add, by typing, by voice in Chrome, Edge and Safari, or from photos when the AI is on
  - goals, study progress, Today, Calendar, Open Loops and Ask
  - the morning brief and text/email drafting, with buttons that open Gmail or Messages
- **Not yet:** automatic connections to Google Calendar, Gmail and Canvas. Real accounts are told this, and they add things themselves for now. The "Look around with sample data" option on the first screen shows how those connections would work.
