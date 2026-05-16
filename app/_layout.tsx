import '@/styles/global.css';
import '@/i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import i18n from 'i18next';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';

// Keep the splash up until the auth + settings bootstrap completes.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore: splash may already be hidden on web.
});

function RealtimeBridge() {
  const status = useAuthStore((s) => s.status);
  useRealtimeSync(status === 'authenticated');
  return null;
}

/**
 * Applies persisted user settings (theme + language) to the runtime.
 * - Theme: NativeWind's `setColorScheme` accepts 'light' | 'dark' | 'system'.
 * - Language: i18next's `changeLanguage` swaps the active locale immediately.
 */
function SettingsBridge() {
  const theme = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  useEffect(() => {
    if (i18n.language !== language) {
      // eslint-disable-next-line import/no-named-as-default-member -- i18next exposes .changeLanguage as an instance method
      void i18n.changeLanguage(language);
    }
  }, [language]);

  return null;
}

function RootBoundary({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <ErrorBoundary
      fallbackTitle={t('errors.crashTitle')}
      fallbackDescription={t('errors.crashHint')}
      retryLabel={t('common.retry')}
    >
      {children}
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  const initializeAuth = useAuthStore((s) => s.initialize);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const authStatus = useAuthStore((s) => s.status);
  const settingsReady = useSettingsStore((s) => s.initialized);

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
    [],
  );

  useEffect(() => {
    void hydrateSettings();
    void initializeAuth();
  }, [hydrateSettings, initializeAuth]);

  const ready = authStatus !== 'loading' && settingsReady;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {
        // ignore
      });
    }
  }, [ready]);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-50 dark:bg-ink-900">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsBridge />
      <RealtimeBridge />
      <StatusBar style="auto" />
      <RootBoundary>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="contact/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="contact/[id]" />
          <Stack.Screen name="debt/[id]" />
          <Stack.Screen name="transaction/[id]" />
          <Stack.Screen name="transactions" />
        </Stack>
      </RootBoundary>
    </QueryClientProvider>
  );
}
