/**
 * Regression test for the Round-4 OAuth redirect bug.
 *
 * History:
 *   - Commit before 76ee127 hardcoded `redirectTo: 'https://director-accounting.vercel.app'`,
 *     which broke Google sign-in on every Vercel preview deployment (Google
 *     would round-trip the user back to production or, when production
 *     wasn't allow-listed, to Supabase's Site URL — both different origins
 *     than where the PKCE code_verifier was stored).
 *   - Commit 76ee127 swapped that for `${window.location.origin}/auth-callback`.
 *
 * This test fails loudly if anyone ever reintroduces a hardcoded origin in
 * the web OAuth path.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { signInWithOAuthMock } = vi.hoisted(() => ({
  signInWithOAuthMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { signInWithOAuth: signInWithOAuthMock },
  },
}));

// expo-auth-session / expo-web-browser are imported at the top of the store
// but only reached on native; stub them out so the module loads under jsdom.
vi.mock('expo-auth-session', () => ({
  makeRedirectUri: () => 'directorbook://auth-callback',
}));
vi.mock('expo-web-browser', () => ({
  openAuthSessionAsync: vi.fn(),
}));

// eslint-disable-next-line import/first
import { useAuthStore } from '@/stores/authStore';

describe('signInWithGoogle (web)', () => {
  beforeEach(() => {
    signInWithOAuthMock.mockReset();
    signInWithOAuthMock.mockResolvedValue({ data: { url: null }, error: null });
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB = 'test-client-id';
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
    vi.clearAllMocks();
  });

  it('passes redirectTo derived from window.location.origin (not a hardcoded URL)', async () => {
    await useAuthStore.getState().signInWithGoogle();

    expect(signInWithOAuthMock).toHaveBeenCalledTimes(1);
    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth-callback` },
    });
  });

  it('never reintroduces the old hardcoded production origin', async () => {
    await useAuthStore.getState().signInWithGoogle();

    const arg = signInWithOAuthMock.mock.calls[0]![0] as {
      options: { redirectTo: string };
    };
    // If this fails, someone hardcoded a host again — fix the call site, do
    // NOT update the test to match.
    expect(arg.options.redirectTo).not.toContain('director-accounting.vercel.app');
    expect(arg.options.redirectTo.startsWith(window.location.origin)).toBe(true);
    expect(arg.options.redirectTo.endsWith('/auth-callback')).toBe(true);
  });
});
