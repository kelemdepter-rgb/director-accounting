import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Supabase credentials are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.',
  );
}

/**
 * Token storage adapter.
 * - Native (iOS / Android): expo-secure-store (Keychain / Keystore).
 * - Web: defer to Supabase's built-in localStorage default (passing `undefined`).
 *
 * SecureStore is unavailable on web; using it there would throw.
 */
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // RN/web do not support URL-fragment-based session detection automatically.
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});
