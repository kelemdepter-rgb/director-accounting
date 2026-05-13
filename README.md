# Director Accounting

Cross-platform (iOS + Android + Web) SaaS accounting app for small business directors.
Tracks income, expenses, and debts with smart contact pickup from the device address book.

> **Status:** In active build via Claude Code. See the master prompt at
> `prompts/02-MASTER-PROMPT.md` (kept outside this repo) for full scope.

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
| i18n | i18next + react-i18next (English + Uyghur) |
| Testing | Vitest + React Native Testing Library |
| Tooling | ESLint, Prettier, TypeScript strict |

---

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment template and fill in real values (see Step 2 & 3 of the build plan):
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
| `npm run test` | Run Vitest test suite |
| `npm run test:watch` | Vitest in watch mode |

---

## Security notes

- All Supabase tables use Row Level Security with `auth.uid() = user_id`.
- Only the public `anon` key is shipped to clients; the `service_role` key is never used outside server admin tasks.
- Auth tokens are stored in `expo-secure-store` (Keychain / Keystore), never AsyncStorage.
- Supabase Auth handles rate limiting (5 failed logins → 15-minute lockout) — configure in Supabase Dashboard → Authentication → Rate Limits.
- Phone-book contacts are read only with explicit permission and never uploaded until the user adds them to the app.

---

## Project layout

```
director-accounting/
├── app/                   # Expo Router routes
│   ├── (auth)/            # login, register, forgot-password
│   ├── (tabs)/            # Home, Contacts, Settings
│   ├── contact/[id].tsx   # contact detail
│   ├── debt/[id].tsx      # debt detail
│   └── _layout.tsx        # root layout
├── src/
│   ├── components/        # reusable UI
│   ├── lib/               # supabase client, auth, contacts helpers
│   ├── stores/            # Zustand stores
│   ├── hooks/             # TanStack Query hooks
│   ├── schemas/           # Zod validation
│   ├── i18n/              # English + Uyghur translations
│   ├── styles/            # global tailwind entry
│   └── utils/             # currency, date, debt math
├── supabase/migrations/   # SQL schema migrations
├── __tests__/             # Vitest unit tests
└── ...
```

---

## License

Private — internal company use.
