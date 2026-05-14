import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TransactionListItem } from '@/components/TransactionListItem';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useContacts } from '@/hooks/useContacts';
import { useTransactions } from '@/hooks/useTransactions';
import { notify } from '@/lib/confirm';
import type { ContactRow, TransactionRow, TransactionType } from '@/types/database';
import { downloadCsv, toCsv } from '@/utils/csv';
import { formatDate } from '@/utils/date';

type Filter = 'all' | TransactionType;

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
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-row items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <Button
          label={t('common.cancel')}
          variant="ghost"
          size="sm"
          onPress={() => router.back()}
        />
        <Text
          accessibilityRole="header"
          className="flex-1 px-2 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50"
        >
          {t('transactions.title')}
        </Text>
        <Button
          label={t('transactions.export')}
          variant="ghost"
          size="sm"
          onPress={onExport}
        />
      </View>

      <View className="gap-3 px-5 pt-3">
        <TextInput
          accessibilityLabel={t('transactions.searchPlaceholder')}
          placeholder={t('transactions.searchPlaceholder')}
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          className="h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />

        <View className="flex-row gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          {(['all', 'income', 'expense'] as const).map((option) => {
            const active = option === filter;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(option)}
                className={`flex-1 items-center rounded-md px-3 py-2 ${active ? 'bg-white shadow-sm dark:bg-neutral-700' : ''}`}
              >
                <Text
                  className={`text-sm ${active ? 'font-semibold text-neutral-900 dark:text-neutral-50' : 'text-neutral-600 dark:text-neutral-300'}`}
                >
                  {option === 'all'
                    ? t('transactions.filterAll')
                    : option === 'income'
                      ? t('debts.receivable')
                      : t('quickAdd.expense')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {txnQ.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
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
            <TransactionListItem
              transaction={item}
              contactName={item.contact_id ? contactById.get(item.contact_id)?.full_name : null}
              onPress={(t2) =>
                router.push({ pathname: '/transaction/[id]', params: { id: t2.id } })
              }
            />
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
