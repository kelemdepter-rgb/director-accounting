/**
 * Round 5 §2 — statistics sub-page.
 *
 * Hosts the three KPI cards (today's income / today's expense /
 * outstanding balance) that used to live on the home screen. The user's
 * primary "who owes me / who do I owe" question now lives on the home
 * list; these numbers remain useful for spot-checking daily activity and
 * cumulative balance, so they keep a home of their own behind a header
 * link rather than being deleted.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SafeAreaView, Text, View } from 'react-native';

import { ScreenScroll } from '@/components/ScreenScroll';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/constants/theme';
import { useSummary } from '@/hooks/useSummary';
import { formatMoney } from '@/utils/currency';

interface SummaryCardProps {
  label: string;
  totals: Record<string, number>;
  toneClass: string;
  iconBg: string;
  iconName: keyof typeof Ionicons.glyphMap;
  emptyText?: string;
  signed?: boolean;
}

function SummaryCard({
  label,
  totals,
  toneClass,
  iconBg,
  iconName,
  emptyText,
  signed = false,
}: SummaryCardProps) {
  const entries = Object.entries(totals).filter(([, v]) => v !== 0);
  return (
    <Card elevation="card" className="p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-300">
          {label}
        </Text>
        <View
          className={`h-9 w-9 items-center justify-center rounded-full ${iconBg}`}
          accessibilityElementsHidden
        >
          <Ionicons name={iconName} size={18} color="#fff" />
        </View>
      </View>
      {entries.length === 0 ? (
        <Text className="mt-3 text-2xl font-semibold text-ink-400 dark:text-ink-500">
          {emptyText ?? '—'}
        </Text>
      ) : (
        <View className="mt-3 gap-1">
          {entries.map(([currency, total]) => {
            if (signed) {
              const positive = total > 0;
              const cls = positive ? 'text-income-600' : 'text-payable-600';
              return (
                <Text
                  key={currency}
                  className={`text-2xl font-bold ${cls}`}
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {positive ? '+' : '−'}
                  {formatMoney(Math.abs(total), currency)}
                </Text>
              );
            }
            return (
              <Text
                key={currency}
                className={`text-2xl font-bold ${toneClass}`}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatMoney(total, currency)}
              </Text>
            );
          })}
        </View>
      )}
    </Card>
  );
}

function SummarySkeleton() {
  return (
    <Card elevation="card" className="p-5">
      <View className="flex-row items-center justify-between">
        <Skeleton width={80} height={12} />
        <Skeleton width={36} height={36} radius={18} />
      </View>
      <Skeleton width={140} height={28} style={{ marginTop: 16 }} />
    </Card>
  );
}

export default function StatsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const summaryQ = useSummary();

  const outstandingNet = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [currency, totals] of Object.entries(summaryQ.data?.outstanding ?? {})) {
      const value = totals.receivable - totals.payable;
      if (value !== 0) out[currency] = value;
    }
    return out;
  }, [summaryQ.data]);

  return (
    <SafeAreaView className="flex-1 bg-ink-50 dark:bg-ink-900">
      <View className="flex-row items-center justify-between border-b border-ink-200 px-5 py-3 dark:border-ink-700">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-ink-100 dark:bg-ink-700"
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink[700]} />
        </Pressable>
        <Text
          accessibilityRole="header"
          className="text-lg font-semibold text-ink-900 dark:text-ink-50"
        >
          {t('home.statsLink')}
        </Text>
        <View className="w-10" />
      </View>

      <ScreenScroll insideTabs={false} contentContainerStyle={{ padding: 20, gap: 12 }}>
        {summaryQ.isLoading ? (
          <>
            <SummarySkeleton />
            <SummarySkeleton />
            <SummarySkeleton />
          </>
        ) : (
          <>
            <SummaryCard
              label={t('home.todayIncome')}
              totals={summaryQ.data?.todayIncome ?? {}}
              toneClass="text-income-600"
              iconBg="bg-income-500"
              iconName="arrow-up-circle"
            />
            <SummaryCard
              label={t('home.todayExpense')}
              totals={summaryQ.data?.todayExpense ?? {}}
              toneClass="text-expense-600"
              iconBg="bg-expense-500"
              iconName="arrow-down-circle"
            />
            <SummaryCard
              label={t('home.outstandingDebt')}
              totals={outstandingNet}
              toneClass="text-payable-600"
              iconBg="bg-payable-500"
              iconName="time"
              signed
            />
          </>
        )}
      </ScreenScroll>
    </SafeAreaView>
  );
}
