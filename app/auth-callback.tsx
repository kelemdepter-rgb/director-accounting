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
 * Supabase sends the user back to `/auth-callback?code=...` after they
 * complete the Google sign-in flow. We swap the `code` for a session via
 * `exchangeCodeForSession`, then bounce to the home route so the app's
 * normal auth-gated routing takes over.
 */
export default function AuthCallbackScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!code) {
        if (!cancelled) setError(t('errors.unknown'));
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;
      if (exchangeError) {
        const msg = exchangeError.message || '';
        const isPkceMissing = /pkce|code verifier/i.test(msg);
        if (isPkceMissing) {
          // Almost always means the OAuth flow began at one origin and the
          // redirect landed at another — i.e. Supabase fell back to Site URL
          // because the redirect_to URL is not on the dashboard allow-list.
          const origin =
            typeof window !== 'undefined' ? window.location.origin : '(non-web)';
          // eslint-disable-next-line no-console
          console.error(
            '[auth-callback] PKCE code_verifier not found at %s. The OAuth flow likely landed here from a different origin because the Supabase Redirect URLs allow-list does not include the origin where login was initiated. Open Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs and add a pattern that matches it (e.g. https://*.vercel.app/**).',
            origin,
          );
          setError(`${msg}\n\nCurrent origin: ${origin}`);
          return;
        }
        // eslint-disable-next-line no-console
        console.error('[auth-callback] exchangeCodeForSession failed:', exchangeError);
        setError(msg || t('errors.unknown'));
        return;
      }
      router.replace('/');
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
