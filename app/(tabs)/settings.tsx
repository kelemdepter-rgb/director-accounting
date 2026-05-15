import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { CurrencyPicker } from '@/components/CurrencyPicker';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { useAuthStore } from '@/stores/authStore';
import {
  type Language,
  type Theme,
  useSettingsStore,
} from '@/stores/settingsStore';

const THEME_OPTIONS: { value: Theme; key: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', key: 'settings.themeLight', icon: 'sunny-outline' },
  { value: 'system', key: 'settings.themeSystem', icon: 'phone-portrait-outline' },
  { value: 'dark', key: 'settings.themeDark', icon: 'moon-outline' },
];

const LANGUAGE_OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { value: 'ug', label: 'ئۇيغۇرچە', flag: '✦' },
];

function SectionHeader({ label }: { label: string }) {
  return (
    <Text className="mb-2 mt-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">
      {label}
    </Text>
  );
}

function ThemeSegment({
  value,
  onChange,
}: {
  value: Theme;
  onChange: (next: Theme) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row gap-1 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
      {THEME_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 ${active ? 'bg-white shadow-sm dark:bg-ink-700' : ''}`}
          >
            <Ionicons
              name={option.icon}
              size={16}
              color={active ? colors.brand[500] : colors.ink[500]}
            />
            <Text
              className={`text-sm ${active ? 'font-semibold text-ink-900 dark:text-ink-50' : 'text-ink-500 dark:text-ink-400'}`}
            >
              {t(option.key)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LanguageRow({
  option,
  active,
  onPress,
}: {
  option: (typeof LANGUAGE_OPTIONS)[number];
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-3 active:bg-ink-50 dark:active:bg-ink-800"
    >
      <View className="flex-row items-center gap-3">
        <Text className="text-lg">{option.flag}</Text>
        <Text className="text-base text-ink-900 dark:text-ink-50">{option.label}</Text>
      </View>
      <View
        className={`h-5 w-5 items-center justify-center rounded-full border-2 ${active ? 'border-income-500' : 'border-ink-300 dark:border-ink-600'}`}
      >
        {active ? <View className="h-2.5 w-2.5 rounded-full bg-income-500" /> : null}
      </View>
    </Pressable>
  );
}

export default function SettingsTab() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const theme = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const setDefaultCurrency = useSettingsStore((s) => s.setDefaultCurrency);

  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    const ok = await confirm({
      title: t('auth.signOut'),
      message: t('settings.signOutConfirm'),
      confirmLabel: t('auth.signOut'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView className="flex-1 bg-ink-50 dark:bg-ink-900">
      <ScrollView contentContainerClassName="px-5 py-6 gap-3">
        {/* Account hero */}
        <Card className="flex-row items-center gap-3 p-4" elevation="card">
          <Avatar name={user?.email ?? ''} size={48} />
          <View className="flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">
              {t('settings.account')}
            </Text>
            <Text
              className="mt-0.5 text-base text-ink-900 dark:text-ink-50"
              numberOfLines={1}
            >
              {user?.email ?? '—'}
            </Text>
          </View>
        </Card>

        <SectionHeader label={t('settings.appearance')} />

        <Card className="p-4">
          <Text className="mb-3 text-sm font-semibold text-ink-900 dark:text-ink-50">
            {t('settings.theme')}
          </Text>
          <ThemeSegment value={theme} onChange={(next) => void setTheme(next)} />
          <Text className="mt-2 text-xs text-ink-500 dark:text-ink-400">
            {t('settings.themeHint')}
          </Text>
        </Card>

        <SectionHeader label={t('settings.language')} />

        <Card className="overflow-hidden p-0">
          {LANGUAGE_OPTIONS.map((option, idx) => (
            <View key={option.value}>
              {idx > 0 ? <View className="h-px bg-ink-100 dark:bg-ink-700" /> : null}
              <LanguageRow
                option={option}
                active={option.value === language}
                onPress={() => void setLanguage(option.value)}
              />
            </View>
          ))}
        </Card>

        <SectionHeader label={t('settings.defaultCurrency')} />

        <Card className="p-4">
          <CurrencyPicker
            value={defaultCurrency}
            onChange={(next) => void setDefaultCurrency(next)}
          />
          <Text className="mt-2 text-xs text-ink-500 dark:text-ink-400">
            {t('settings.defaultCurrencyHint')}
          </Text>
        </Card>

        <View className="mt-6">
          <Button
            label={t('auth.signOut')}
            variant="danger"
            onPress={onSignOut}
            loading={signingOut}
            fullWidth
            leftIcon={<Ionicons name="log-out-outline" size={18} color="#fff" />}
          />
        </View>

        <Text className="mt-6 text-center text-xs text-ink-400 dark:text-ink-500">
          {t('app.name')} · v{appVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
