import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TransactionListItem } from '@/components/TransactionListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/constants/theme';
import { useContacts } from '@/hooks/useContacts';
import { useTransactions } from '@/hooks/useTransactions';
import { notify } from '@/lib/confirm';
import type { ContactRow, TransactionRow, TransactionType } from '@/types/database';
import { downloadCsv, toCsv } from '@/utils/csv';
import { formatDate } from '@/utils/date';

type Filter = 'all' | TransactionType;

const FILTERS: { value: Filter; key: string }[] = [
  { value: 'all', key: 'transactions.filterAll' },
  { value: 'income', key: 'quickAdd.income' },
  { value: 'expense', key: 'quickAdd.expense' },
];

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const txnQ = useTransactions({
    type: filter === 'all' ? undefined : filter,
    limit: 500,
  });
  const contactsQ = useContacts({});

  const contactById = useMemo(() => {
    const map = new Map<string, ContactRow>();
    for (const c of contactsQ.data ?? []) map.set(c.id, c);
    return map;
  }, [contactsQ.data]);

  const filtered = useMemo(() => {
    const list = txnQ.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((tx) => {
      const contact = tx.contact_id ? contactById.get(tx.contact_id) : null;
      return (
        (contact?.full_name.toLowerCase().includes(q) ?? false) ||
        (tx.description?.toLowerCase().includes(q) ?? false) ||
        tx.amount.includes(q) ||
        tx.currency.toLowerCase().includes(q)
      );
    });
  }, [txnQ.data, search, contactById]);

  const onExport = () => {
    if (filtered.length === 0) {
      notify(t('app.name'), t('transactions.exportEmpty'));
      return;
    }
    const csv = toCsv<TransactionRow>(filtered, [
      { header: 'Date', value: (r) => formatDate(r.occurred_at, 'long') },
      { header: 'Type', value: (r) => r.type },
      { header: 'Amount', value: (r) => r.amount },
      { header: 'Currency', value: (r) => r.currency },
      {
        header: 'Contact',
        value: (r) => (r.contact_id ? contactById.get(r.contact_id)?.full_name ?? '' : ''),
      },
      { header: 'Description', value: (r) => r.description ?? '' },
    ]);
    downloadCsv(`transactions-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-50 dark:bg-ink-950">
      {/* Header bar */}
      <View className="flex-row items-center justify-between bg-white px-4 py-3 dark:bg-ink-900">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full active:bg-ink-100 dark:active:bg-ink-700"
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink[700]} />
        </Pressable>
        <Text
          accessibilityRole="header"
          className="flex-1 px-2 text-center text-base font-bold text-ink-900 dark:text-ink-50"
        >
          {t('transactions.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('transactions.export')}
          onPress={onExport}
          className="h-9 w-9 items-center justify-center rounded-full active:bg-ink-100 dark:active:bg-ink-700"
        >
          <Ionicons name="download-outline" size={20} color={colors.brand[500]} />
        </Pressable>
      </View>

      {/* Search + filters */}
      <View className="gap-3 px-5 py-3">
        <View className="flex-row items-center gap-2 rounded-2xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-800">
          <Ionicons name="search" size={18} color={colors.ink[400]} />
          <TextInput
            accessibilityLabel={t('transactions.searchPlaceholder')}
            placeholder={t('transactions.searchPlaceholder')}
            placeholderTextColor={colors.ink[400]}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            className="h-11 flex-1 text-base text-ink-900 dark:text-ink-50"
          />
          {search ? (
            <Pressable accessibilityRole="button" onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.ink[400]} />
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row gap-1 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
          {FILTERS.map((option) => {
            const active = option.value === filter;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(option.value)}
                className={`flex-1 items-center rounded-lg px-3 py-2 ${active ? 'bg-white shadow-sm dark:bg-ink-700' : ''}`}
              >
                <Text
                  className={`text-sm ${active ? 'font-semibold text-ink-900 dark:text-ink-50' : 'text-ink-500 dark:text-ink-400'}`}
                >
                  {t(option.key)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {txnQ.isLoading ? (
        <View className="gap-2 px-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              className="rounded-2xl border border-ink-100 bg-white p-4 dark:border-ink-700 dark:bg-ink-800"
            >
              <Skeleton width="70%" height={14} />
              <Skeleton width="40%" height={11} style={{ marginTop: 8 }} />
            </View>
          ))}
        </View>
      ) : txnQ.isError ? (
        <EmptyState
          icon="⚠️"
          title={t('errors.unknown')}
          action={{ label: t('common.retry'), onPress: () => void txnQ.refetch() }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={
            search || filter !== 'all'
              ? t('transactions.noMatches')
              : t('home.noTransactionsYet')
          }
          description={
            search || filter !== 'all'
              ? t('transactions.noMatchesHint')
              : t('home.noTransactionsHint')
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="px-5">
              <View className="mb-2 overflow-hidden rounded-2xl border border-ink-100 bg-white dark:border-ink-700 dark:bg-ink-800">
                <TransactionListItem
                  transaction={item}
                  contactName={
                    item.contact_id ? contactById.get(item.contact_id)?.full_name : null
                  }
                  onPress={(tx) =>
                    router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })
                  }
                />
              </View>
            </View>
          )}
          contentContainerClassName="pb-10"
          refreshing={txnQ.isFetching && !txnQ.isLoading}
          onRefresh={() => void txnQ.refetch()}
          initialNumToRender={25}
        />
      )}
    </SafeAreaView>
  );
}
