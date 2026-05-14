import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions } from 'react-native';

import { useAuthStore } from '@/stores/authStore';

/** Tablet/desktop breakpoint where the tab bar moves to the left as a sidebar. */
const SIDEBAR_BREAKPOINT = 768;

export default function TabsLayout() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const { width } = useWindowDimensions();
  const isWide = width >= SIDEBAR_BREAKPOINT;

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: t('app.name'),
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#6b7280',
        // Bottom on phones; left rail on tablets and web.
        tabBarPosition: isWide ? 'left' : 'bottom',
        tabBarLabelPosition: isWide ? 'beside-icon' : 'below-icon',
        tabBarStyle: isWide
          ? { width: 220, borderRightWidth: 1, borderRightColor: '#e5e7eb' }
          : undefined,
        tabBarItemStyle: isWide ? { justifyContent: 'flex-start' } : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: t('tabs.contacts'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
