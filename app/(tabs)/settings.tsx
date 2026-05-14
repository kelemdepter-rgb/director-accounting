import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { CurrencyPicker } from '@/components/CurrencyPicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { confirm } from '@/lib/confirm';
import { useAuthStore } from '@/stores/authStore';
import {
  type Language,
  type Theme,
  useSettingsStore,
} from '@/stores/settingsStore';

const THEME_OPTIONS: { value: Theme; key: string }[] = [
  { value: 'system', key: 'settings.themeSystem' },
  { value: 'light', key: 'settings.themeLight' },
  { value: 'dark', key: 'settings.themeDark' },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ug', label: 'ئۇيغۇرچە' },
];

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  renderLabel,
  accessibilityLabel,
}: {
  options: readonly { value: T }[];
  value: T;
  onChange: (next: T) => void;
  renderLabel: (option: { value: T }) => string;
  accessibilityLabel?: string;
}) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      className="flex-row gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center rounded-md px-3 py-2 ${active ? 'bg-white shadow-sm dark:bg-neutral-700' : ''}`}
          >
            <Text
              className={`text-sm ${active ? 'font-semibold text-neutral-900 dark:text-neutral-50' : 'text-neutral-600 dark:text-neutral-300'}`}
            >
              {renderLabel(option)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsTab() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const theme = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const appDisplayName = useSettingsStore((s) => s.appDisplayName);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const setDefaultCurrency = useSettingsStore((s) => s.setDefaultCurrency);
  const setAppDisplayName = useSettingsStore((s) => s.setAppDisplayName);

  const [pendingName, setPendingName] = useState(appDisplayName);
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

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <ScrollView contentContainerClassName="px-5 py-6 gap-4">
        <Card>
          <Text className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {t('settings.account')}
          </Text>
          <Text className="mt-1 text-base text-neutral-900 dark:text-neutral-100">
            {user?.email ?? '—'}
          </Text>
        </Card>

        <Card>
          <Text className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {t('settings.theme')}
          </Text>
          <SegmentedControl<Theme>
            options={THEME_OPTIONS}
            value={theme}
            onChange={(next) => void setTheme(next)}
            renderLabel={(option) =>
              t(THEME_OPTIONS.find((o) => o.value === option.value)?.key ?? '')
            }
            accessibilityLabel={t('settings.theme')}
          />
          <Text className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {t('settings.themeHint')}
          </Text>
        </Card>

        <Card>
          <Text className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {t('settings.language')}
          </Text>
          <SegmentedControl<Language>
            options={LANGUAGE_OPTIONS}
            value={language}
            onChange={(next) => void setLanguage(next)}
            renderLabel={(option) =>
              LANGUAGE_OPTIONS.find((l) => l.value === option.value)?.label ?? option.value
            }
            accessibilityLabel={t('settings.language')}
          />
        </Card>

        <Card>
          <Text className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {t('settings.defaultCurrency')}
          </Text>
          <CurrencyPicker
            value={defaultCurrency}
            onChange={(next) => void setDefaultCurrency(next)}
          />
          <Text className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {t('settings.defaultCurrencyHint')}
          </Text>
        </Card>

        <Card>
          <Text className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {t('settings.appDisplayName')}
          </Text>
          <Input
            value={pendingName}
            onChangeText={setPendingName}
            placeholder="Director Accounting"
            autoCapitalize="words"
          />
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <Button
                label={t('common.cancel')}
                variant="ghost"
                onPress={() => setPendingName(appDisplayName)}
                fullWidth
              />
            </View>
            <View className="flex-1">
              <Button
                label={t('common.save')}
                onPress={() => void setAppDisplayName(pendingName)}
                disabled={pendingName.trim() === appDisplayName || pendingName.trim().length === 0}
                fullWidth
              />
            </View>
          </View>
          <Text className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {t('settings.appDisplayNameHint')}
          </Text>
        </Card>

        <View className="mt-4">
          <Button
            label={t('auth.signOut')}
            variant="danger"
            onPress={onSignOut}
            loading={signingOut}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
