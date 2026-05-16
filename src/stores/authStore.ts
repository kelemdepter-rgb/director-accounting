import type { AuthError, Session, User } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  /** Latest user-visible error key (i18n key). */
  errorKey: string | null;
  initialized: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsEmailConfirm: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  clearError: () => void;
}

const GOOGLE_REDIRECT_PATH = 'auth-callback';
// Implicit flow drops the access_token in the URL hash fragment, so the
// redirect target must be a URL whose page boots Supabase (which then
// auto-detects the fragment thanks to `detectSessionInUrl: true`). The root
// URL works; `/auth-callback` does too — both serve a Supabase-aware bundle.
// Hard-coded to production because Supabase requires the URL to be on the
// allow-list configured in the dashboard.
const GOOGLE_WEB_REDIRECT_URL = 'https://director-accounting.vercel.app';

/**
 * Map Supabase auth errors to our i18n keys, falling back to a generic message.
 * Supabase emits both `message` strings and (newer) machine `code` fields; we check both.
 */
function mapAuthError(error: AuthError | { message?: string; code?: string }): string {
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = (error.message ?? '').toLowerCase();

  if (
    code === 'invalid_credentials' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid_credentials')
  ) {
    return 'errors.invalidCredentials';
  }
  if (
    code === 'user_already_exists' ||
    message.includes('already registered') ||
    message.includes('already exists')
  ) {
    return 'errors.userAlreadyExists';
  }
  if (code === 'user_not_found' || message.includes('user not found')) {
    return 'errors.userNotFound';
  }
  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    message.includes('rate limit') ||
    message.includes('too many')
  ) {
    return 'errors.rateLimited';
  }
  if (
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed')
  ) {
    return 'errors.network';
  }
  return 'errors.unknown';
}

function buildRedirectUri(path: string): string {
  return AuthSession.makeRedirectUri({
    scheme: 'directorbook',
    path,
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  status: 'loading',
  errorKey: null,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    set({ initialized: true });
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        set({ status: 'unauthenticated', errorKey: mapAuthError(error) });
        return;
      }
      const session = data.session;
      set({
        session,
        user: session?.user ?? null,
        status: session ? 'authenticated' : 'unauthenticated',
      });
    } catch (err) {
      set({
        status: 'unauthenticated',
        errorKey: mapAuthError(err as AuthError),
      });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        status: session ? 'authenticated' : 'unauthenticated',
      });
    });
  },

  signIn: async (email, password) => {
    set({ errorKey: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ errorKey: mapAuthError(error) });
      throw error;
    }
  },

  signUp: async (email, password) => {
    set({ errorKey: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: buildRedirectUri('email-confirmed'),
      },
    });
    if (error) {
      set({ errorKey: mapAuthError(error) });
      throw error;
    }
    // When email confirmation is required, session is null until the user clicks the link.
    return { needsEmailConfirm: data.session === null };
  },

  signOut: async () => {
    set({ errorKey: null });
    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ errorKey: mapAuthError(error) });
      throw error;
    }
  },

  resetPassword: async (email) => {
    set({ errorKey: null });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildRedirectUri('reset-password'),
    });
    if (error) {
      set({ errorKey: mapAuthError(error) });
      throw error;
    }
  },

  signInWithGoogle: async () => {
    set({ errorKey: null });
    const clientIdConfigured =
      !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ||
      !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ||
      !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;

    if (!clientIdConfigured) {
      set({ errorKey: 'auth.googleNotConfigured' });
      throw new Error('Google OAuth client ID not configured');
    }

    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: GOOGLE_WEB_REDIRECT_URL },
      });
      if (error) {
        set({ errorKey: mapAuthError(error) });
        throw error;
      }
      return;
    }

    const redirectTo = buildRedirectUri(GOOGLE_REDIRECT_PATH);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) {
      set({ errorKey: mapAuthError(error ?? { message: 'no auth url' })});
      throw error ?? new Error('No OAuth URL returned');
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') {
      // User cancelled or the browser was dismissed; not an error worth surfacing.
      return;
    }

    // Supabase returns tokens in the URL fragment (#access_token=...&refresh_token=...).
    const url = result.url;
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return;
    const params = new URLSearchParams(url.substring(hashIndex + 1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (sessionError) {
        set({ errorKey: mapAuthError(sessionError) });
        throw sessionError;
      }
    }
  },

  clearError: () => set({ errorKey: null }),
}));
