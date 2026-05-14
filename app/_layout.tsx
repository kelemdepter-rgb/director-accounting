import '@/styles/global.css';
import '@/i18n';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '@/stores/authStore';

// Keep the splash up until the auth bootstrap completes.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore: splash may already be hidden on web.
});

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const status = useAuthStore((s) => s.status);

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
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync().catch(() => {
        // ignore
      });
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Slot />
    </QueryClientProvider>
  );
}
