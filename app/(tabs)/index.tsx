import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from 'react-native';

import { QuickAddPicker } from '@/components/QuickAddPicker';
import { QuickAddSheet, type QuickAddMode } from '@/components/QuickAddSheet';
import { TransactionListItem } from '@/components/TransactionListItem';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useContacts } from '@/hooks/useContacts';
import { useSummary } from '@/hooks/useSummary';
import { useTransactions } from '@/hooks/useTransactions';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ContactRow } from '@/types/database';
import { formatMoney } from '@/utils/currency';

function SummaryRow({
  label,
  totals,
  emptyText,
  toneClass,
}: {
  label: string;
  totals: Record<string, number>;
  emptyText: string;
  toneClass: string;
}) {
  const entries = Object.entries(totals).filter(([, v]) => v > 0);
  return (
    <Card className="flex-1" accent="none">
      <Text className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </Text>
      {entries.length === 0 ? (
        <Text className="mt-1 text-base text-neutral-400 dark:text-neutral-500">
          {emptyText}
        </Text>
      ) : (
        <View className="mt-1 gap-0.5">
          {entries.map(([currency, total]) => (
            <Text key={currency} className={`text-xl font-bold ${toneClass}`}>
              {formatMoney(total, currency)}
            </Text>
          ))}
        </View>
      )}
    </Card>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const summaryQ = useSummary();
  const txnQ = useTransactions({ limit: 25 });
  const contactsQ = useContacts({ enabled: true });

  const contactById = useMemo(() => {
    const map = new Map<string, ContactRow>();
    for (const c of contactsQ.data ?? []) map.set(c.id, c);
    return map;
  }, [contactsQ.data]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<QuickAddMode | null>(null);

  const openPicker = () => setPickerOpen(true);
  const onPick = (mode: QuickAddMode) => {
    setPickerOpen(false);
    setSheetMode(mode);
  };
  const closeSheet = () => setSheetMode(null);

  const outstandingTotals = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [currency, totals] of Object.entries(summaryQ.data?.outstanding ?? {})) {
      const value = totals.receivable - totals.payable;
      if (value !== 0) out[currency] = value;
    }
    return out;
  }, [summaryQ.data]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <FlatList
        data={txnQ.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item}
            contactName={item.contact_id ? contactById.get(item.contact_id)?.full_name : null}
          />
        )}
        contentContainerClassName="pb-32"
        refreshing={txnQ.isFetching && !txnQ.isLoading}
        onRefresh={() => {
          void txnQ.refetch();
          void summaryQ.refetch();
        }}
        ListHeaderComponent={
          <View className="gap-4 px-5 py-5">
            <View className="flex-row gap-3">
              <SummaryRow
                label={t('home.todayIncome')}
                totals={summaryQ.data?.todayIncome ?? {}}
                emptyText="—"
                toneClass="text-income"
              />
              <SummaryRow
                label={t('home.todayExpense')}
                totals={summaryQ.data?.todayExpense ?? {}}
                emptyText="—"
                toneClass="text-expense"
              />
            </View>

            <Card accent="brand">
              <Text className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {t('home.outstandingDebt')}
              </Text>
              {Object.keys(outstandingTotals).length === 0 ? (
                <Text className="mt-1 text-base text-neutral-400 dark:text-neutral-500">
                  —
                </Text>
              ) : (
                <View className="mt-1 gap-0.5">
                  {Object.entries(outstandingTotals).map(([currency, net]) => {
                    const positive = net > 0;
                    return (
                      <Text
                        key={currency}
                        className={`text-xl font-bold ${positive ? 'text-receivable' : 'text-payable'}`}
                      >
                        {positive ? '+' : '−'}
                        {formatMoney(Math.abs(net), currency)}
                      </Text>
                    );
                  })}
                  <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {t('home.outstandingHint')}
                  </Text>
                </View>
              )}
            </Card>

            <Text className="mt-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('home.recentTransactions')}
            </Text>
          </View>
        }
        ListEmptyComponent={
          summaryQ.isLoading || txnQ.isLoading ? (
            <View className="items-center justify-center py-10">
              <ActivityIndicator color="#4f46e5" />
            </View>
          ) : (
            <EmptyState
              icon="🧾"
              title={t('home.noTransactionsYet')}
              description={t('home.noTransactionsHint')}
              action={{ label: t('quickAdd.openPicker'), onPress: openPicker }}
            />
          )
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('quickAdd.openPicker')}
        onPress={openPicker}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand-600 shadow-lg active:bg-brand-700"
      >
        <Text className="text-2xl text-white">＋</Text>
      </Pressable>

      <QuickAddPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={onPick}
      />
      <QuickAddSheet
        visible={!!sheetMode}
        mode={sheetMode}
        onClose={closeSheet}
        defaultCurrency={defaultCurrency}
      />
    </SafeAreaView>
  );
}
