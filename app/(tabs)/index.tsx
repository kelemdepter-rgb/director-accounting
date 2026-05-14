import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';

export default function HomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <ScrollView contentContainerClassName="px-6 py-8">
        <View className="rounded-2xl bg-brand-50 p-5 dark:bg-brand-900/40">
          <Text className="text-xs uppercase tracking-wider text-brand-700 dark:text-brand-200">
            {t('app.name')}
          </Text>
          <Text className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            {t('auth.welcome')}
          </Text>
          {user?.email ? (
            <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {user.email}
            </Text>
          ) : null}
        </View>

        <Text className="mt-8 text-base text-neutral-600 dark:text-neutral-400">
          The Home screen scaffolding is in place. Income/expense/debt UI will be built in Step 5.
        </Text>

        <View className="mt-8">
          <Button
            label={t('auth.signOut')}
            variant="secondary"
            onPress={onSignOut}
            loading={signingOut}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
