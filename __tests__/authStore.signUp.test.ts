/**
 * Round 5 §3 — authStore coverage for the sign-up + check-inbox path.
 *
 * What this pins:
 *   1. mapAuthError routes the new edge cases (email_not_confirmed,
 *      weak_password, signup_disabled, rate limit, network) to the
 *      correct i18n key — these are the messages friends saw as
 *      generic "Something went wrong" before this round.
 *   2. resendSignUpEmail forwards `type: 'signup'` to supabase.auth.resend
 *      and surfaces errors via errorKey.
 *
 * No browser, no Playwright — these contracts cover the unit of work
 * touched in §3. The end-to-end flow still needs a real Supabase
 * instance to verify, and the user does that on-device.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { resendMock } = vi.hoisted(() => ({
  resendMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { resend: resendMock },
  },
}));

vi.mock('expo-auth-session', () => ({
  makeRedirectUri: ({ path }: { path: string }) => `directorbook://${path}`,
}));
vi.mock('expo-web-browser', () => ({
  openAuthSessionAsync: vi.fn(),
}));

// eslint-disable-next-line import/first
import { mapAuthError, useAuthStore } from '@/stores/authStore';

describe('mapAuthError — Round 5 §3 additions', () => {
  it('routes email_not_confirmed to the dedicated key', () => {
    expect(mapAuthError({ code: 'email_not_confirmed' })).toBe(
      'errors.emailNotConfirmed',
    );
    expect(mapAuthError({ message: 'Email not confirmed' })).toBe(
      'errors.emailNotConfirmed',
    );
  });

  it('routes weak_password to weakPassword (code + message variants)', () => {
    expect(mapAuthError({ code: 'weak_password' })).toBe('errors.weakPassword');
    expect(mapAuthError({ message: 'Password is too weak' })).toBe(
      'errors.weakPassword',
    );
    expect(
      mapAuthError({ message: 'Password should be at least 8 characters' }),
    ).toBe('errors.weakPassword');
  });

  it('routes signup_disabled / email_provider_disabled to signupDisabled', () => {
    expect(mapAuthError({ code: 'signup_disabled' })).toBe('errors.signupDisabled');
    expect(mapAuthError({ code: 'email_provider_disabled' })).toBe(
      'errors.signupDisabled',
    );
    expect(mapAuthError({ message: 'Signups not allowed for this instance' })).toBe(
      'errors.signupDisabled',
    );
  });

  it('still routes existing cases (regression guard)', () => {
    expect(mapAuthError({ message: 'Invalid login credentials' })).toBe(
      'errors.invalidCredentials',
    );
    expect(mapAuthError({ message: 'User already registered' })).toBe(
      'errors.userAlreadyExists',
    );
    expect(mapAuthError({ code: 'over_email_send_rate_limit' })).toBe(
      'errors.rateLimited',
    );
    expect(mapAuthError({ message: 'failed to fetch' })).toBe('errors.network');
    expect(mapAuthError({ message: 'something weird' })).toBe('errors.unknown');
  });
});

describe('resendSignUpEmail', () => {
  beforeEach(() => {
    resendMock.mockReset();
    useAuthStore.setState({ errorKey: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('forwards type: signup with the email and the email-confirmed redirect', async () => {
    resendMock.mockResolvedValue({ error: null });

    await useAuthStore.getState().resendSignUpEmail('user@example.com');

    expect(resendMock).toHaveBeenCalledTimes(1);
    const arg = resendMock.mock.calls[0]![0] as {
      type: string;
      email: string;
      options?: { emailRedirectTo?: string };
    };
    expect(arg.type).toBe('signup');
    expect(arg.email).toBe('user@example.com');
    // The redirect uses the same buildRedirectUri('email-confirmed') the
    // sign-up flow uses, so a tap on the resent link drops the user in
    // exactly the same spot the original would have.
    expect(arg.options?.emailRedirectTo).toBe('directorbook://email-confirmed');
  });

  it('surfaces errors via errorKey AND re-throws so the caller can stop the spinner', async () => {
    resendMock.mockResolvedValue({
      error: { message: 'Email rate limit exceeded' },
    });

    await expect(
      useAuthStore.getState().resendSignUpEmail('user@example.com'),
    ).rejects.toBeDefined();
    expect(useAuthStore.getState().errorKey).toBe('errors.rateLimited');
  });
});
