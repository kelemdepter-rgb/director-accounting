# Supabase Setup — Plain-Language Guide

> Bu hujjet ikki tilda yazılıdu: avval English, andin ئۇيغۇرچە.
> Below, English first, then Uyghur.

This folder contains the SQL migrations and the step-by-step instructions to set up the Supabase backend for **Director Accounting**.

---

## Part 1 — Create your Supabase project (5 minutes)

1. Open **https://supabase.com** in your browser.
2. Click **Start your project** → sign in with GitHub or email.
3. After logging in, click **New project**.
4. Fill in:
   - **Name:** `director-accounting`
   - **Database password:** pick a strong password and **save it in a password manager** (you will need it again).
   - **Region:** pick the closest one to you.
   - **Pricing plan:** **Free** is enough to start.
5. Click **Create new project**. Wait about 2 minutes for the project to provision.

---

## Part 2 — Run the three SQL migrations (in order)

> ⚠️ Run the three files **in numerical order**: 001 → 002 → 003. Skipping or reordering will break.

For each file:

1. In the left sidebar of your Supabase project, click **SQL Editor** (`</>` icon).
2. Click **+ New query**.
3. Open the migration file from this folder in any text editor.
4. **Select all** the SQL text (`Ctrl+A`) and **copy** it (`Ctrl+C`).
5. **Paste** it into the SQL Editor in the browser.
6. Click the green **Run** button (or press `Ctrl+Enter`).
7. You should see **"Success. No rows returned"** at the bottom. If you see a red error, copy the error text and paste it back to Claude.

Run these files in this order:

| Order | File | What it does |
|---|---|---|
| 1 | `001_initial_schema.sql` | Creates the four tables: contacts, transactions, debts, debt_payments |
| 2 | `002_rls_policies.sql` | Locks every table so only the logged-in owner can read or change their own rows |
| 3 | `003_triggers_and_views.sql` | Adds auto-updated timestamps, auto-settle logic, and the balance view |

**Verify the tables exist:**

1. In the left sidebar, click **Table Editor**.
2. You should see **contacts**, **transactions**, **debts**, **debt_payments** — all empty.
3. Click any table → the **Authentication** tab in the row should show "RLS enabled".

---

## Part 3 — Enable Email auth (already on by default)

1. In the left sidebar, click **Authentication** → **Providers**.
2. **Email** should already be **enabled**. If not, toggle it on.
3. Scroll down and make sure **Confirm email** is **enabled** (recommended for production).
4. Click **Save** if you changed anything.

### Recommended: enable rate limiting

1. **Authentication** → **Rate Limits**.
2. **Sign-in attempts per IP per hour:** `30` (the default is fine).
3. **Email sends per IP per hour:** keep default.

> Supabase will automatically lock an account after several failed attempts; you don't need to write any code for that.

---

## Part 4 — Enable Google OAuth (we'll finish this in Step 3)

For now, just **leave it off**. In Step 3 (Authentication Flow) Claude will walk you through getting a Google OAuth Client ID from Google Cloud Console and enabling Google here.

When that step comes, you'll come back to:

- **Authentication** → **Providers** → **Google**
- Toggle on, paste in the **Client ID** and **Client Secret** from Google Cloud Console.

---

## Part 5 — Copy your credentials into the app

After the SQL has been run, Claude will ask you for two values from your Supabase project:

1. In the left sidebar, click the **gear icon** (Project Settings) → **API**.
2. Find the section **Project URL** — copy the URL (looks like `https://xxxxxxxx.supabase.co`). This is your `EXPO_PUBLIC_SUPABASE_URL`.
3. Find the section **Project API keys** → copy the **`anon` `public`** key (a long string starting with `eyJ...`). This is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

> 🔒 **Never share** the **`service_role`** key. We do **not** need it — leave it in Supabase.
>
> The `anon` key is safe to put into client code because every table is protected by Row Level Security.

Paste both into Claude when asked. Claude will write them to your local `.env` file (which is **never** committed to git).

---

# ئۇيغۇرچە قوللانما

بۇ قىسقۇچ Director Accounting ئەپىنىڭ Supabase ساندان سەپلىمە ھۆججەتلىرىنى ئۆز ئىچىگە ئالىدۇ.

## 1-بۆلەك: Supabase تۈرى قۇرۇش (5 مىنۇت)

1. براۋزېردا **https://supabase.com** نى ئېچىڭ.
2. **Start your project** نى چېكىپ، GitHub ياكى email بىلەن كىرىڭ.
3. كىرگەندىن كېيىن **New project** نى چېكىڭ.
4. تۆۋەندىكىنى تولدۇرۇڭ:
   - **Name:** `director-accounting`
   - **Database password:** كۈچلۈك پارول تاللاڭ، **پارول باشقۇرغۇچتا ساقلاڭ** (كېيىن لازىم بولىدۇ).
   - **Region:** ئەڭ يېقىن رايوننى تاللاڭ.
   - **Pricing plan:** **Free** كۇپايە.
5. **Create new project** نى چېكىڭ. 2 مىنۇتچە ساقلاڭ.

## 2-بۆلەك: ئۈچ SQL migration نى تەرتىپ بويىچە ئىجرا قىلىش

> ⚠️ **چوقۇم تەرتىپ بويىچە:** 001 → 002 → 003. ئاتلاپ ئۆتمەڭ.

ھەربىر ھۆججەت ئۈچۈن:

1. Supabase نىڭ سول تەرەپتىكى تىزىملىكتىن **SQL Editor** نى چېكىڭ.
2. **+ New query** نى چېكىڭ.
3. مۇشۇ قىسقۇچتىكى migration ھۆججىتىنى ئاچقۇچ بىلەن ئېچىپ، **ھەممىنى تاللاپ كۆچۈرۈڭ** (`Ctrl+A`, `Ctrl+C`).
4. SQL Editor غا **چاپلاڭ** (`Ctrl+V`).
5. يېشىل **Run** كۇنۇپكىسىنى بېسىڭ (ياكى `Ctrl+Enter`).
6. ئاستىدا "Success. No rows returned" دەپ كۆرۈنسە بولىدۇ. قىزىل خاتالىق چىقسا، خاتالىق تېكىستىنى Claude غا چاپلاپ بېرىڭ.

| تەرتىپ | ھۆججەت | نېمە قىلىدۇ |
|---|---|---|
| 1 | `001_initial_schema.sql` | تۆت جەدۋەل قۇرىدۇ |
| 2 | `002_rls_policies.sql` | ھەربىر جەدۋەلنى ئىگىسىگە چەكلەيدۇ (RLS) |
| 3 | `003_triggers_and_views.sql` | ۋاقىت چەكلىمە، ئاپتوماتىك تۈگىتىش، باھا قاراش جەدۋىلى |

**جەدۋەللەرنى تەكشۈرۈش:** سول تەرەپتىن **Table Editor** نى چېكىڭ — `contacts`, `transactions`, `debts`, `debt_payments` كۆرۈنىدۇ.

## 3-بۆلەك: Email Auth نى قوزغىتىش

1. سول تەرەپ: **Authentication** → **Providers**.
2. **Email** ئاللىبۇرۇن **يېنىق** بولىدۇ. بولمىسا ئاچىڭ.
3. **Confirm email** نىمۇ ئاچقىنىڭىز ياخشى.
4. Save بېسىڭ.

## 4-بۆلەك: Google OAuth نى ھازىرچە قويۇپ تۇرۇش

ھازىرچە **ئاچمايمىز**. 3-قەدەمدە Claude سىزگە Google Cloud Console دىن Client ID ئېلىشنى ئۆگىتىدۇ.

## 5-بۆلەك: ئىككى ئاچقۇچنى Claude غا بېرىش

1. سول تەرەپتىكى **Gear icon** (Settings) → **API** نى چېكىڭ.
2. **Project URL** نى كۆچۈرۈڭ (مەسىلەن `https://xxxx.supabase.co`).
3. **anon public** ئاچقۇچىنى كۆچۈرۈڭ (`eyJ...` بىلەن باشلىنىدۇ).
4. ئىككىسىنى Claude غا چاپلاپ بېرىڭ — Claude `.env` ھۆججىتىگە يازىدۇ.

> 🔒 **service_role** ئاچقۇچىنى **ھەرگىز بەرمەڭ، ھەرگىز كۆپەيتمەڭ**. بىزگە لازىم ئەمەس.
> `anon` ئاچقۇچ بىخەتەر، چۈنكى ھەربىر جەدۋەل RLS بىلەن قوغدالغان.
