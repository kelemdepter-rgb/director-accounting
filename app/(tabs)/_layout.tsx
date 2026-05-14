import { Redirect, Tabs } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';

export default function TabsLayout() {
  const status = useAuthStore((s) => s.status);

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#4f46e5',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
    </Tabs>
  );
}
