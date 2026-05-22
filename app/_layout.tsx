import '@/styles/global.css';
import '@/lib/nativewindInterop';
import '@/i18n';

import {
  DarkTheme,
  DefaultTheme,
  type Theme,
  ThemeProvider,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import i18n from 'i18next';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DebugScrollOverlay } from '@/components/DebugScrollOverlay';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { colors } from '@/constants/theme';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Navigation themes that match the app's ink palette.
 *
 * Every <Stack.Screen> renders inside a react-navigation container whose
 * background colour comes from the active theme — NOT from any Tailwind
 * class. If we leave it on the defaults, the container is pure white in
 * light mode and #1c1c1e in dark mode; neither matches our screens. The
 * result is the "white main content area behind a dark sidebar" the user
 * was seeing: NativeWind dark:bg-ink-900 was painting the SafeAreaView,
 * but any gap (rounding, safe-area insets, list padding) leaked the white
 * react-navigation surface through.
 */
const NavLightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.ink[50],
    card: '#FFFFFF',
    text: colors.ink[900],
    border: colors.ink[200],
    primary: colors.brand[500],
  },
};

const NavDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.ink[900],
    card: colors.ink[800],
    text: colors.ink[50],
    border: colors.ink[700],
    primary: colors.income,
  },
};

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

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeBg = isDark ? colors.ink[900] : colors.ink[50];
  const navTheme = isDark ? NavDarkTheme : NavLightTheme;

  // Defensive: ensure the `dark` class is on <html> when in dark mode on web.
  // NativeWind v4 normally does this via setColorScheme, but doing it
  // explicitly sidesteps timing edge cases and lines the CSS rules in
  // global.css up with the JS-controlled bg colours we apply below.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [isDark]);

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
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: themeBg,
        }}
      >
        <ActivityIndicator size="large" color={colors.income} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SettingsBridge />
        <RealtimeBridge />
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RootBoundary>
          <ThemeProvider value={navTheme}>
            <View style={{ flex: 1, backgroundColor: themeBg }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: themeBg },
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="contact/new" options={{ presentation: 'modal' }} />
                <Stack.Screen name="contact/[id]" />
                <Stack.Screen name="debt/[id]" />
                <Stack.Screen name="transaction/[id]" />
                <Stack.Screen name="transactions" />
              </Stack>
              <DebugScrollOverlay />
            </View>
          </ThemeProvider>
        </RootBoundary>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
