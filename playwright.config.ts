/**
 * Round 5 §4 — Playwright config for the mobile-scroll regression guard.
 *
 * Why iPhone 12 + Pixel 5: every previous round shipped a "scroll fix"
 * that looked correct in DevTools emulation and broke on the user's
 * actual phone. These two device descriptors are the closest off-the-
 * shelf approximations of the hardware the user actually tests on
 * (Safari on iOS, Chrome on a modern Android). Add more profiles only
 * if a real-device regression reveals a third behaviour.
 *
 * Web server:
 *   The tests need the static export served on a port. We point at the
 *   `web` config in .claude/launch.json (npx expo serve --port 8081),
 *   which Playwright will spawn before the first test if it isn't
 *   already running. The expo serve takes ~3s to come up; reuseExisting
 *   makes consecutive `npm run test:e2e` runs near-instant after the
 *   first cold start.
 *
 *   Set BASE_URL in CI / for remote previews:
 *     BASE_URL=https://director-accounting.vercel.app npm run test:e2e
 */
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8081';
const USE_EXTERNAL = !!process.env.BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'iPhone 12 (Safari)',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Pixel 5 (Chrome)',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Skip spinning up a local server when the user pointed BASE_URL at
  // a deployed origin — they want to run against a real preview.
  webServer: USE_EXTERNAL
    ? undefined
    : {
        // Match the build:test:serve flow — export once, then serve the
        // static dist. Skipping the build keeps the inner dev loop fast;
        // CI runs `npm run build` separately before `test:e2e`.
        command: 'npx expo serve --port 8081',
        url: 'http://localhost:8081',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
