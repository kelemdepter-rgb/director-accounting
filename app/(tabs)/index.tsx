import { useTranslation } from 'react-i18next';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';

export default function HomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <ScrollView contentContainerClassName="px-5 py-6 gap-4">
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

        <View className="flex-row gap-3">
          <Card className="flex-1" accent="income">
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('home.todayIncome')}
            </Text>
            <Text className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-50">
              —
            </Text>
          </Card>
          <Card className="flex-1" accent="expense">
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('home.todayExpense')}
            </Text>
            <Text className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-50">
              —
            </Text>
          </Card>
        </View>

        <Card accent="receivable">
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('home.outstandingDebt')}
          </Text>
          <Text className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-50">
            —
          </Text>
        </Card>

        <Text className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {t('home.upcomingHint')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
