import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

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
        headerShown: !isWide,
        headerTitle: t('app.name'),
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontWeight: '700',
          color: colors.ink[900],
        },
        tabBarActiveTintColor: isWide ? '#FFFFFF' : colors.brand[500],
        tabBarInactiveTintColor: isWide ? '#CBD5E1' : colors.ink[400],
        tabBarPosition: isWide ? 'left' : 'bottom',
        tabBarLabelPosition: isWide ? 'beside-icon' : 'below-icon',
        tabBarStyle: isWide
          ? {
              width: 240,
              backgroundColor: colors.brand[500],
              borderRightWidth: 0,
              paddingTop: 24,
            }
          : {
              height: 64,
              paddingTop: 6,
              paddingBottom: 8,
              borderTopColor: colors.ink[100],
            },
        tabBarItemStyle: isWide
          ? {
              justifyContent: 'flex-start',
              borderRadius: 12,
              marginHorizontal: 12,
              marginVertical: 4,
              paddingHorizontal: 12,
            }
          : undefined,
        tabBarLabelStyle: isWide
          ? { fontSize: 14, fontWeight: '600', marginLeft: 12 }
          : { fontSize: 11, fontWeight: '600' },
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

