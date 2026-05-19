import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

const SIDEBAR_BREAKPOINT = 768;

export default function TabsLayout() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const { colorScheme } = useColorScheme();
  const { width } = useWindowDimensions();
  const isWide = width >= SIDEBAR_BREAKPOINT;
  const isDark = colorScheme === 'dark';

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  // Native nav surfaces (header, bottom tab bar) don't pick up Tailwind classes,
  // so we feed them explicit hex values keyed off the current colour scheme.
  const headerBg = isDark ? colors.ink[900] : '#FFFFFF';
  const headerText = isDark ? colors.ink[50] : colors.ink[900];
  const sceneBg = isDark ? colors.ink[900] : colors.ink[50];
  const tabBarBg = isWide
    ? colors.brand[500]
    : isDark
      ? colors.ink[800]
      : '#FFFFFF';
  const tabBarBorder = isDark ? colors.ink[700] : colors.ink[100];
  // Narrow + dark used to be brand-500 on ink-800 — both deep navies, the
  // active item was effectively invisible. Use the income green there
  // instead so the selected tab stands out.
  const tabBarActive = isWide
    ? '#FFFFFF'
    : isDark
      ? colors.income
      : colors.brand[500];
  const tabBarInactive = isWide ? colors.ink[300] : colors.ink[400];

  return (
    <Tabs
      screenOptions={{
        headerShown: !isWide,
        headerTitle: t('app.name'),
        headerStyle: {
          backgroundColor: headerBg,
        },
        headerTitleStyle: {
          fontWeight: '700',
          color: headerText,
        },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: sceneBg },
        tabBarActiveTintColor: tabBarActive,
        tabBarInactiveTintColor: tabBarInactive,
        tabBarPosition: isWide ? 'left' : 'bottom',
        tabBarLabelPosition: isWide ? 'beside-icon' : 'below-icon',
        tabBarStyle: isWide
          ? {
              width: 240,
              backgroundColor: tabBarBg,
              borderRightWidth: 0,
              paddingTop: 24,
            }
          : {
              height: 64,
              paddingTop: 6,
              paddingBottom: 8,
              backgroundColor: tabBarBg,
              borderTopColor: tabBarBorder,
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
