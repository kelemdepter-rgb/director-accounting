# DirectorBook · PatronDefteri · دېرىكتور دەپتىرى

Cross-platform (iOS + Android + Web) SaaS bookkeeping app for small business
directors. Tracks income, expenses, and debts — with a smart contact picker
that pulls names from the device address book.

> The app ships in three languages out of the box:
> **English (DirectorBook)** · **Türkçe (PatronDefteri)** · **ئۇيغۇرچە (دېرىكتور دەپتىرى)**.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Expo SDK 54 + Expo Router v6 (TypeScript strict) |
| Platforms | iOS, Android, Web (Expo Web) |
| Styling | NativeWind v4 (Tailwind v3) |
| Client state | Zustand |
| Server state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Backend | Supabase (Auth + Postgres + RLS + Realtime) |
| Contacts | expo-contacts (permission-gated) |
| Secure storage | expo-secure-store |
| i18n | i18next + react-i18next (English, Turkish, Uyghur) |
| Testing | Vitest + React Native Testing Library |
| Tooling | ESLint, Prettier, TypeScript strict |

---

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment template and fill in real values (see `supabase/README.md` for Step 2 details):
   ```bash
   cp .env.example .env
   ```
3. Start the dev server:
   ```bash
   npm run web      # browser
   npm run ios      # iOS simulator (macOS only)
   npm run android  # Android emulator
   npm run dev      # interactive picker
   ```

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `start` | Launch Expo dev server (interactive) |
| `npm run web` | Run web build in browser |
| `npm run ios` / `android` | Run on simulator/emulator |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format all files |
| `npm run typecheck` | TypeScript no-emit check |
| `npm run test` | Run unit + component tests (see [Testing](#testing)) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:integration` | Live-Supabase RLS + RPC tests (needs env vars) |

---

## Testing

| Command | What it runs | Where it runs |
| --- | --- | --- |
| `npm run test` | Unit + component tests (currency, debt math, CSV, locale-aware amount parsing, RPC contract, `QuickAddSheet`). | Locally and in CI. |
| `npm run test:watch` | Vitest in watch mode for the same suite. | Locally. |
| `npm run test:integration` | RLS + RPC integration tests against a real Supabase project. Skips automatically when `SUPABASE_TEST_URL` / `SUPABASE_TEST_ANON_KEY` are not set. | Locally only — **not** in CI. |

### Running the integration suite

The integration tests live in `__tests__/integration/` and need a throwaway
Supabase project (a local `supabase start` instance is ideal). Before running
them:

1. Provision a fresh project and apply every migration in `supabase/migrations/`
   in numeric order.
2. In **Authentication → Providers → Email**, disable "Confirm email" so
   `supabase.auth.signUp` returns a usable session immediately.
3. Export the project's URL and `anon` key, then run the suite:
   ```bash
   export SUPABASE_TEST_URL=https://<project>.supabase.co
   export SUPABASE_TEST_ANON_KEY=<anon-key>
   npm run test:integration
   ```

The suite creates throwaway users on every run; rerunning is safe but does
accumulate accounts in the test project — recreate the project periodically.

CI (see `.github/workflows/ci.yml`) intentionally only runs `npm run test`.
The integration suite needs credentials and is best driven from a protected
environment or manually before a release.

---

## Security notes

- All Supabase tables use Row Level Security with `auth.uid() = user_id`.
- Only the public `anon` key is shipped to clients; the `service_role` key is never used outside server admin tasks.
- Auth tokens are stored in `expo-secure-store` (Keychain / Keystore), never AsyncStorage.
- Supabase Auth handles rate limiting (5 failed logins → 15-minute lockout) — configure in **Supabase Dashboard → Authentication → Rate Limits**.
- Phone-book contacts are read only with explicit permission and never uploaded until the user adds them to the app.

---

## Internationalisation

The app ships with three first-class languages:

| Code | Language | App name |
| --- | --- | --- |
| `en` | English | **DirectorBook** |
| `tr` | Türkçe  | **PatronDefteri** |
| `ug` | ئۇيغۇرچە | **دېرىكتور دەپتىرى** |

Strings live in `src/i18n/{en,tr,ug}.json`. The active language is picked from
the user's setting (Settings → Language) and falls back to the device locale,
then English. All strings are user-facing translations — no English copy is
hard-coded in components.

---

## Project layout

```
directorbook/
├── app/                   # Expo Router routes
│   ├── (auth)/            # login, register, forgot-password
│   ├── (tabs)/            # Home, Contacts, Settings
│   ├── contact/[id].tsx   # contact detail
│   ├── debt/[id].tsx      # debt detail
│   └── _layout.tsx        # root layout
├── src/
│   ├── components/        # reusable UI
│   ├── lib/               # supabase client, auth, contacts helpers
│   ├── stores/            # Zustand stores (auth, settings)
│   ├── hooks/             # TanStack Query hooks + realtime sync
│   ├── schemas/           # Zod validation
│   ├── i18n/              # en + tr + ug translations
│   ├── styles/            # global tailwind entry
│   └── utils/             # currency, date, debt math
├── supabase/migrations/   # SQL schema + RLS + triggers + realtime
├── __tests__/             # Vitest unit tests (43+ tests)
└── ...
```

---

## License

Private — internal company use.
