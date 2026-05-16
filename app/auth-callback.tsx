import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, SafeAreaView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

/**
 * OAuth redirect target.
 *
 * Two cases to handle, depending on the provider's flow type:
 *
 *   1. PKCE flow → URL looks like `/auth-callback?code=...`. We swap the
 *      `code` for a session via `exchangeCodeForSession`.
 *   2. Implicit flow → tokens land in the URL **hash fragment**
 *      (`#access_token=...&refresh_token=...`). Query-param parsers don't
 *      see the fragment, so we pull it off `window.location.hash`
 *      ourselves and feed it to `setSession`.
 *
 * The supabase client is configured with `detectSessionInUrl: true`, so in
 * the implicit case it normally picks the tokens up on its own; we still
 * parse them defensively in case someone lands here from a non-root
 * redirect target.
 */
export default function AuthCallbackScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function parseHashTokens(): { access_token: string; refresh_token: string } | null {
      if (typeof window === 'undefined') return null;
      const hash = window.location.hash;
      if (!hash || hash.length < 2) return null;
      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (!access_token || !refresh_token) return null;
      return { access_token, refresh_token };
    }

    async function run() {
      const hashTokens = parseHashTokens();
      if (hashTokens) {
        const { error: sessionError } = await supabase.auth.setSession(hashTokens);
        if (cancelled) return;
        if (sessionError) {
          setError(sessionError.message || t('errors.unknown'));
          return;
        }
        router.replace('/');
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          setError(exchangeError.message || t('errors.unknown'));
          return;
        }
        router.replace('/');
        return;
      }

      // Neither hash fragment nor `?code=` — someone hit the URL directly.
      if (!cancelled) setError(t('errors.unknown'));
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [code, router, t]);

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-ink-50 px-6 dark:bg-ink-900">
      {error ? (
        <View className="w-full max-w-sm gap-4">
          <Text className="text-center text-base text-expense-600 dark:text-expense-100">
            {error}
          </Text>
          <Button
            label={t('auth.signIn')}
            onPress={() => router.replace('/(auth)/login')}
            fullWidth
          />
        </View>
      ) : (
        <View className="items-center gap-3">
          <ActivityIndicator size="large" color={colors.brand[500]} />
          <Text className="text-sm text-ink-500 dark:text-ink-300">
            {t('common.loading')}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
