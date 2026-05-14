import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { confirm } from '@/lib/confirm';
import { useAuthStore } from '@/stores/authStore';

export default function SettingsTab() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
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
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('settings.morePlaceholder')}
          </Text>
          <Text className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            {t('settings.morePlaceholderHint')}
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
