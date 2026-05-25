/**
 * Round 5 §2 — home page rewrite.
 *
 * The previous home was three KPI cards (today's income / today's expense
 * / outstanding balance). Two of them were almost always empty because
 * the user rarely records multiple transactions on the same day, and the
 * third buried "who owes me what" behind a single signed number. The
 * user's restated request: "at a glance, very clearly, show who owes me
 * how much, who I owe how much, on what dates — as a list."
 *
 * This screen renders two list sections (receivables / payables), one row
 * per (contact, currency) with an open balance. The KPI cards moved to a
 * separate Statistics sub-page reachable from the header — they're still
 * useful, just not the primary surface.
 *
 * Data comes from `v_home_list` (migration 020) via `useHomeList`, which
 * is invalidated by every mutation that can change a balance.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, SafeAreaView, Text, View } from 'react-native';

import { HomeSection } from '@/components/HomeSection';
import { QuickAddFab } from '@/components/QuickAddFab';
import { QuickAddSheet, type QuickAddMode } from '@/components/QuickAddSheet';
import { ScreenScroll } from '@/components/ScreenScroll';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/constants/theme';
import { useHomeList } from '@/hooks/useHomeList';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatDate } from '@/utils/date';
import { currentGreetingKey } from '@/utils/greeting';

const FAB_SLOT = 72; // QuickAddFab footprint — keeps the bottom row reachable.

const I18N_TO_LOCALE: Record<string, string> = {
  en: 'en-US',
  tr: 'tr-TR',
  ug: 'ug',
};

function localeFor(language: string): string {
  return I18N_TO_LOCALE[language] ?? language;
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const homeQ = useHomeList();

  const [sheetMode, setSheetMode] = useState<QuickAddMode | null>(null);

  const locale = useMemo(() => localeFor(i18n.language), [i18n.language]);

  const receivables = useMemo(
    () => (homeQ.data ?? []).filter((r) => Number(r.net_receivable) > 0),
    [homeQ.data],
  );
  const payables = useMemo(
    () => (homeQ.data ?? []).filter((r) => Number(r.net_payable) > 0),
    [homeQ.data],
  );

  const greeting = t(currentGreetingKey());
  const displayName =
    user?.user_metadata?.full_name ??
    (user?.email ? user.email.split('@')[0] : '') ??
    '';
  const today = formatDate(new Date(), 'long', locale);

  const onRowPress = (row: { contact_id: string }) =>
    router.push({ pathname: '/contact/[id]', params: { id: row.contact_id } });

  return (
    <SafeAreaView className="flex-1 bg-ink-50 dark:bg-ink-900">
      <ScreenScroll insideTabs footerHeight={FAB_SLOT}>
        <View className="gap-5 py-6">
          {/* Greeting + Statistics link */}
          <View className="flex-row items-start justify-between px-5">
            <View className="flex-1">
              <Text className="text-sm text-ink-500 dark:text-ink-300">{today}</Text>
              <Text className="mt-1 text-2xl font-bold text-ink-900 dark:text-ink-50">
                {greeting}
                {displayName ? `, ${displayName}` : ''} 👋
              </Text>
              <Text className="mt-0.5 text-sm text-ink-500 dark:text-ink-300">
                {t('home.subtitle')}
              </Text>
            </View>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t('home.statsLink')}
              onPress={() => router.push('/stats')}
              className="flex-row items-center gap-1 rounded-full bg-ink-100 px-3 py-1.5 active:opacity-70 dark:bg-ink-700"
            >
              <Ionicons name="stats-chart" size={14} color={colors.brand[500]} />
              <Text className="text-xs font-semibold text-brand-500 dark:text-brand-200">
                {t('home.statsLink')}
              </Text>
            </Pressable>
          </View>

          {homeQ.isLoading ? (
            <View className="items-center py-8">
              <ActivityIndicator color={colors.brand[500]} />
            </View>
          ) : homeQ.isError ? (
            <EmptyState
              icon="⚠️"
              title={t('errors.unknown')}
              action={{ label: t('common.retry'), onPress: () => void homeQ.refetch() }}
            />
          ) : (
            <View className="gap-6">
              <HomeSection
                title={t('home.sectionReceivable')}
                tone="positive"
                rows={receivables}
                emptyMessage={t('home.emptyReceivable')}
                locale={locale}
                defaultCurrency={defaultCurrency}
                onRowPress={onRowPress}
              />
              <HomeSection
                title={t('home.sectionPayable')}
                tone="warning"
                rows={payables}
                emptyMessage={t('home.emptyPayable')}
                locale={locale}
                defaultCurrency={defaultCurrency}
                onRowPress={onRowPress}
              />
            </View>
          )}
        </View>
      </ScreenScroll>

      <QuickAddFab onPick={(mode) => setSheetMode(mode)} />

      <QuickAddSheet
        visible={!!sheetMode}
        mode={sheetMode}
        onClose={() => setSheetMode(null)}
        defaultCurrency={defaultCurrency}
      />
    </SafeAreaView>
  );
}
