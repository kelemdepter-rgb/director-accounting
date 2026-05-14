import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';

export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);

  if (status === 'authenticated') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
