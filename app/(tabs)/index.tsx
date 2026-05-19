import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, SafeAreaView, Text, View } from 'react-native';

import { QuickAddFab } from '@/components/QuickAddFab';
import { QuickAddSheet, type QuickAddMode } from '@/components/QuickAddSheet';
import { TransactionListItem } from '@/components/TransactionListItem';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/constants/theme';
import { useContacts } from '@/hooks/useContacts';
import { useSummary } from '@/hooks/useSummary';
import { useTransactions } from '@/hooks/useTransactions';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ContactRow } from '@/types/database';
import { displayContact } from '@/utils/contact';
import { formatMoney } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { currentGreetingKey } from '@/utils/greeting';

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
    <Card elevation="card" className="w-64 p-5">
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
    <Card elevation="card" className="w-64 p-5">
      <View className="flex-row items-center justify-between">
        <Skeleton width={80} height={12} />
        <Skeleton width={36} height={36} radius={18} />
      </View>
      <Skeleton width={140} height={28} style={{ marginTop: 16 }} />
    </Card>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const summaryQ = useSummary();
  const txnQ = useTransactions({ limit: 10 });
  const contactsQ = useContacts({ enabled: true });

  const contactById = useMemo(() => {
    const map = new Map<string, ContactRow>();
    for (const c of contactsQ.data ?? []) map.set(c.id, c);
    return map;
  }, [contactsQ.data]);

  const [sheetMode, setSheetMode] = useState<QuickAddMode | null>(null);

  const outstandingNet = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [currency, totals] of Object.entries(summaryQ.data?.outstanding ?? {})) {
      const value = totals.receivable - totals.payable;
      if (value !== 0) out[currency] = value;
    }
    return out;
  }, [summaryQ.data]);

  const greeting = t(currentGreetingKey());
  const displayName =
    user?.user_metadata?.full_name ??
    (user?.email ? user.email.split('@')[0] : '') ??
    '';
  const today = formatDate(new Date(), 'long');

  return (
    <SafeAreaView className="flex-1 bg-ink-50 dark:bg-ink-900">
      <FlatList
        data={txnQ.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="px-5">
            <View className="mb-2 overflow-hidden rounded-2xl border border-ink-100 bg-white dark:border-ink-700 dark:bg-ink-800">
              <TransactionListItem
                transaction={item}
                contactName={
                  item.contact_id
                    ? displayContact(contactById.get(item.contact_id) ?? null)
                    : null
                }
                onPress={(tx) =>
                  tx.auto_generated && tx.debt_id
                    ? router.push({ pathname: '/debt/[id]', params: { id: tx.debt_id } })
                    : router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })
                }
              />
            </View>
          </View>
        )}
        contentContainerClassName="pb-32"
        refreshing={txnQ.isFetching && !txnQ.isLoading}
        onRefresh={() => {
          void txnQ.refetch();
          void summaryQ.refetch();
        }}
        ListHeaderComponent={
          <View className="gap-5 px-5 py-6">
            {/* Greeting */}
            <View>
              <Text className="text-sm text-ink-500 dark:text-ink-300">{today}</Text>
              <Text className="mt-1 text-2xl font-bold text-ink-900 dark:text-ink-50">
                {greeting}
                {displayName ? `, ${displayName}` : ''} 👋
              </Text>
            </View>

            {/* Summary cards — horizontally scrollable on phones, wrap on wide screens. */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item}
              data={['income', 'expense', 'debt']}
              ItemSeparatorComponent={() => <View className="w-3" />}
              renderItem={({ item }) => {
                if (summaryQ.isLoading) return <SummarySkeleton />;
                if (item === 'income') {
                  return (
                    <SummaryCard
                      label={t('home.todayIncome')}
                      totals={summaryQ.data?.todayIncome ?? {}}
                      toneClass="text-income-600"
                      iconBg="bg-income-500"
                      iconName="arrow-up-circle"
                    />
                  );
                }
                if (item === 'expense') {
                  return (
                    <SummaryCard
                      label={t('home.todayExpense')}
                      totals={summaryQ.data?.todayExpense ?? {}}
                      toneClass="text-expense-600"
                      iconBg="bg-expense-500"
                      iconName="arrow-down-circle"
                    />
                  );
                }
                return (
                  <SummaryCard
                    label={t('home.outstandingDebt')}
                    totals={outstandingNet}
                    toneClass="text-payable-600"
                    iconBg="bg-payable-500"
                    iconName="time"
                    signed
                  />
                );
              }}
            />

            {/* Recent activity header */}
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-base font-bold text-ink-900 dark:text-ink-50">
                {t('home.recentTransactions')}
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/transactions')}
                className="flex-row items-center gap-0.5"
              >
                <Text className="text-sm font-semibold text-brand-500 dark:text-brand-200">
                  {t('home.seeAll')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.brand[500]} />
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          txnQ.isLoading ? (
            <View className="gap-2 px-5">
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  className="rounded-2xl border border-ink-100 bg-white p-4 dark:border-ink-700 dark:bg-ink-800"
                >
                  <Skeleton width="70%" height={14} />
                  <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="🧾"
              title={t('home.noTransactionsYet')}
              description={t('home.noTransactionsHint')}
            />
          )
        }
      />

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
