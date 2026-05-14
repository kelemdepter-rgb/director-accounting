# Deployment Guide

This file walks you through publishing **DirectorBook** on the web, the App
Store (iOS), and Google Play (Android). All instructions are written in plain
language; you do not need any prior deployment experience.

> Everything below assumes the project runs locally with `npm run web` first.
> If it doesn't, fix that before deploying.

---

## Part 1 — Web (Vercel, free)

Vercel hosts your web build behind a custom domain in a couple of minutes.

### 1.1 Build locally and check the output

```bash
npm run web -- --no-dev --output dist
```

Wait until you see `Exported: dist`. The `dist/` folder is a fully static
website — open `dist/index.html` in your browser to sanity-check it.

### 1.2 Push the project to GitHub

1. Create a new private repository on https://github.com/new
2. From the project folder run:
   ```bash
   git remote add origin https://github.com/<your-username>/directorbook.git
   git push -u origin main
   ```

### 1.3 Connect to Vercel

1. Sign in at https://vercel.com (the Hobby plan is free).
2. Click **Add New → Project**, pick your GitHub repo, and click **Import**.
3. Configure:
   - **Framework Preset:** **Other** (Vercel doesn't auto-detect Expo).
   - **Build Command:** `npx expo export --platform web`
   - **Output Directory:** `dist`
   - **Install Command:** leave default (`npm install`).
4. Open the **Environment Variables** section and add — copy the values from
   your local `.env`:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB`
   - `EXPO_PUBLIC_DEFAULT_CURRENCY`
5. Click **Deploy**. After 1–2 minutes you'll get a URL like
   `https://directorbook.vercel.app`.

### 1.4 Update Supabase + Google with the live URL

Now that you have a real https URL, register it everywhere the app authenticates:

1. **Supabase Dashboard → Authentication → URL Configuration**:
   - **Site URL:** `https://directorbook.vercel.app`
   - **Redirect URLs:** add `https://directorbook.vercel.app/**`
2. **Google Cloud Console → APIs & Services → Credentials**:
   - Open your OAuth client.
   - Under **Authorized JavaScript origins**, add `https://directorbook.vercel.app`.
   - Save.

---

## Part 2 — iOS (App Store) via EAS Build

EAS is Expo's hosted build service. You need:

- An **Apple Developer** account (US $99/year): https://developer.apple.com
- A free **Expo** account: https://expo.dev/signup

### 2.1 One-time setup

```bash
npm install -g eas-cli
eas login                   # signs you into Expo
eas build:configure         # creates eas.json (one-time)
```

### 2.2 Build a production binary

```bash
eas build --platform ios --profile production
```

Follow the prompts. EAS will ask for your Apple credentials and bundle
identifier — use `com.directorbook.app` (already set in `app.json`). The build
runs on Expo's servers (10–20 minutes) and produces an `.ipa` file you can
download.

### 2.3 Submit to the App Store

```bash
eas submit --platform ios --latest
```

EAS uploads the IPA to App Store Connect. From there, sign in to
https://appstoreconnect.apple.com to fill in the listing (screenshots,
description, age rating) and click **Submit for Review**.

Review typically takes 24–72 hours. Apple may ask test-account credentials —
create a dedicated test account in DirectorBook and provide its email/password.

---

## Part 3 — Android (Google Play) via EAS Build

### 3.1 One-time setup

You need a **Google Play Developer** account (one-time US $25):
https://play.google.com/console/signup

### 3.2 Build an Android App Bundle

```bash
eas build --platform android --profile production
```

EAS will create a signing key for you (keep the credentials safe!) and
produce a `.aab` file in 10–20 minutes.

### 3.3 Submit to Google Play

```bash
eas submit --platform android --latest
```

You'll be asked to upload a `google-play-service-account.json` the first
time — Expo's docs walk through generating it. Once submitted, finish the
listing in https://play.google.com/console.

First-time apps go through an extended review (a few days). Subsequent
updates roll out within hours.

---

## Part 4 — After every release

Before publishing a new version:

1. Bump `version` in `app.json`.
2. Run all local checks:
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   ```
3. Smoke-test on web and at least one mobile platform.
4. Commit + tag:
   ```bash
   git tag v1.0.1
   git push --tags
   ```
5. Trigger new builds via EAS (`eas build` again) and a Vercel auto-deploy
   (push to `main`).

---

## Part 5 — Production checklist

- [ ] Web URL configured in Supabase **Site URL** and **Redirect URLs**.
- [ ] Web URL configured in Google **Authorized JavaScript origins**.
- [ ] iOS/Android bundle IDs match `app.json` (`com.directorbook.app`).
- [ ] Supabase **Email auth** has `Confirm email` enabled.
- [ ] Supabase **Rate limits** are reasonable for production.
- [ ] No `service_role` key anywhere except the Supabase Dashboard.
- [ ] `.env` is **not** committed to git (it is gitignored by default).
- [ ] All four migrations (`001_initial_schema.sql` … `004_realtime.sql`) ran in Supabase.

Good luck with the launch! 🚀
