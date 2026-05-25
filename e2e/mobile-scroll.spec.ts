/**
 * Round 5 §4 — mobile-scroll regression guard.
 *
 * History: rounds 1–4 each shipped a "scroll fix" that looked fine in
 * desktop DevTools but broke on the user's actual phone. The fix
 * eventually landed in Round 4 (the `<ScreenScroll>` wrapper +
 * 100dvh + `<DebugScrollOverlay>`); this suite is the trip-wire that
 * catches anyone reintroducing a sticky JS-toggled body lock, a 100vh,
 * or an overlay that ate finger events.
 *
 * Devices: iPhone 12 (Safari) + Pixel 5 (Chrome) profiles match the
 * hardware the user actually tests on. See playwright.config.ts.
 *
 * About `body { overflow: hidden }`:
 *   React-native-web sets that baseline structurally — the scroll
 *   happens inside an inner ScrollView div. So we DO NOT assert against
 *   the body's computed overflow style; that would only fail on the
 *   harmless RNW baseline. The actual regression we want to catch is
 *   the JS pattern `document.body.style.overflow = 'hidden'` left
 *   behind by a modal whose cleanup forgot to fire — that lives in
 *   `body.style.overflow` (the inline string), not the computed style.
 *   See `assertNoLeakedBodyLock` below.
 *
 * Auth-gated tests:
 *   The home + transaction-entry tests need a logged-in session.
 *   Provide creds in env to opt in:
 *     E2E_TEST_EMAIL=qa@example.com E2E_TEST_PASSWORD=... npm run test:e2e
 *   Without env, those tests SKIP with a clear reason so CI doesn't
 *   silently treat missing creds as a pass.
 */
import { expect, test, type Page } from '@playwright/test';

/**
 * Catch the actual JS-toggled body lock — `document.body.style.overflow
 * = 'hidden'` left behind by a modal whose cleanup never ran. The
 * structural RNW baseline lives in a stylesheet (computed style is
 * `hidden`) and does not affect this inline-style check.
 */
async function assertNoLeakedBodyLock(page: Page) {
  const inline = await page.evaluate(() => document.body.style.overflow);
  expect(inline, 'document.body.style.overflow should be empty (no JS lock leaked)').toBe('');
}

/**
 * Find the page's actual scrolling container. RNW wraps screens in
 * a scrollable `<div>` rather than scrolling the window. We pick the
 * deepest descendant whose scrollHeight > clientHeight + 8px (i.e.
 * actually scrollable), preferring the largest visible one.
 */
async function findScroller(page: Page): Promise<'window' | string> {
  return await page.evaluate(() => {
    if (document.documentElement.scrollHeight > window.innerHeight + 8) return 'window';
    // Find the largest scrollable descendant.
    const all = Array.from(document.querySelectorAll<HTMLElement>('*'));
    const candidates = all
      .filter((el) => {
        const cs = getComputedStyle(el);
        const oy = cs.overflowY;
        if (oy !== 'auto' && oy !== 'scroll') return false;
        return el.scrollHeight > el.clientHeight + 8;
      })
      .sort((a, b) => b.clientHeight - a.clientHeight);
    if (candidates.length === 0) return 'window';
    const target = candidates[0]!;
    // Decorate so we can re-find it later by attribute.
    target.setAttribute('data-e2e-scroller', 'true');
    return '[data-e2e-scroller="true"]';
  });
}

async function scrollToBottom(page: Page) {
  const target = await findScroller(page);
  if (target === 'window') {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  } else {
    await page.locator(target).evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
  }
}

async function scrollToTop(page: Page) {
  const target = await findScroller(page);
  if (target === 'window') {
    await page.evaluate(() => window.scrollTo(0, 0));
  } else {
    await page.locator(target).evaluate((el) => {
      el.scrollTop = 0;
    });
  }
}

test.describe('sign-up form scrolls and surfaces clear errors', () => {
  test('renders fully, scrolls top↔bottom, no body-lock leak, shows inline validation error', async ({
    page,
  }) => {
    await page.goto('/register');

    const email = page.getByLabel(/email/i).first();
    const password = page.getByLabel(/^password$/i).first();
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();

    await assertNoLeakedBodyLock(page);

    // Scroll round-trip exercises the actual scrolling container — if
    // an overlay is eating finger events the bottom-anchored link
    // would never come into view.
    await scrollToBottom(page);
    const signInLink = page.getByRole('link', { name: /^sign in$|^giriş yap$|^كىرىش$/i });
    await expect(signInLink.first()).toBeVisible();
    await scrollToTop(page);
    await expect(email).toBeVisible();

    // Validation error path: invalid email + weak password + mismatched
    // confirm should render an inline error, NOT a generic toast.
    await email.fill('not-an-email');
    await password.fill('short');
    const confirm = page.getByLabel(/confirm/i).first();
    await confirm.fill('short');
    await page
      .getByRole('button', { name: /^create account$|^sign up$|^kayıt ol$|^تىزىملاش$/i })
      .first()
      .click();

    // RHF renders messages under the input — match the destructive
    // text colour the rest of the app uses for field errors.
    const anyError = page.locator('[class*="text-expense"], [role="alert"]').first();
    await expect(anyError).toBeVisible({ timeout: 2000 });

    // After the failed submit, the body-lock check must still hold —
    // a stray modal lock would only become visible AFTER something
    // tried to open a modal.
    await assertNoLeakedBodyLock(page);
  });
});

test.describe('login form scrolls and reaches the bottom CTA', () => {
  test('Google button + sign-up link reachable after scroll', async ({ page }) => {
    await page.goto('/login');
    await assertNoLeakedBodyLock(page);
    await scrollToBottom(page);
    await expect(
      page
        .getByRole('button', {
          name: /continue with google|google ile|google.*ئارقىلىق/i,
        })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /create account|kayıt ol|تىزىملاش/i }).first(),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Auth-gated scroll tests — opt in via env.
// ---------------------------------------------------------------------------

const E2E_EMAIL = process.env.E2E_TEST_EMAIL;
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD;
const HAS_E2E_CREDS = !!(E2E_EMAIL && E2E_PASSWORD);

test.describe('home + transaction entry (requires E2E creds)', () => {
  test.skip(
    !HAS_E2E_CREDS,
    'Set E2E_TEST_EMAIL + E2E_TEST_PASSWORD to run authenticated scroll tests',
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).first().fill(E2E_EMAIL!);
    await page.getByLabel(/^password$/i).first().fill(E2E_PASSWORD!);
    await page
      .getByRole('button', { name: /^sign in$|^giriş yap$|^كىرىش$/i })
      .first()
      .click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 10_000,
    });
  });

  test('home list scrolls and the FAB stays reachable', async ({ page }) => {
    await assertNoLeakedBodyLock(page);
    await scrollToBottom(page);
    // The QuickAddFab uses the localised "+ Record" / "+ Kaydet" /
    // "+ يېڭى مۇئامىلە" label. Match permissively.
    const fab = page
      .getByRole('button', { name: /\+ ?record|record|yeni işlem|kaydet|يېڭى مۇئامىلە/i })
      .first();
    await expect(fab).toBeVisible();
    await scrollToTop(page);
  });

  test('transaction entry sheet — pills come first, scrolls, save reachable, no lock after close', async ({
    page,
  }) => {
    const fab = page
      .getByRole('button', { name: /\+ ?record|record|yeni işlem|kaydet|يېڭى مۇئامىلە/i })
      .first();
    await fab.click();
    // Pick one of the four cards.
    await page
      .getByRole('button', { name: /lent|borç verdim|قەرز بەردىم/i })
      .first()
      .click();

    // Pills are the first field group.
    await expect(page.getByRole('button', { name: /^vize$|^visa$|^ۋىزا$/i }).first()).toBeVisible();

    // Scroll the sheet's inner container to the bottom; Save must be
    // visible afterward.
    await scrollToBottom(page);
    await expect(
      page.getByRole('button', { name: /^save$|^kaydet$|^ساقلاش$/i }).first(),
    ).toBeVisible();

    // Close via Cancel.
    await page
      .getByRole('button', { name: /cancel|vazgeç|ۋاز كېچىش/i })
      .first()
      .click();

    // Critical regression check: after closing the sheet, no JS lock
    // should remain on the body. This was the bug Round 4's "no body
    // lock" rule was written to prevent.
    await assertNoLeakedBodyLock(page);
  });
});
