import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { useContacts } from '@/hooks/useContacts';
import { useDeleteTransaction } from '@/hooks/useTransactions';
import { supabase } from '@/lib/supabase';
import { confirm, notify } from '@/lib/confirm';
import type { TransactionRow } from '@/types/database';
import { formatMoney, parseUserAmount } from '@/utils/currency';
import { formatDate } from '@/utils/date';

async function fetchTransaction(id: string): Promise<TransactionRow> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as TransactionRow;
}

async function updateTransaction(
  id: string,
  patch: { amount?: number; description?: string | null },
): Promise<TransactionRow> {
  const { data, error } = await supabase
    .from('transactions')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as TransactionRow;
}

export default function TransactionDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const contactsQ = useContacts({});
  const deleteTxn = useDeleteTransaction();

  const [txn, setTxn] = useState<TransactionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const row = await fetchTransaction(id);
        if (!cancelled) {
          setTxn(row);
          setAmount(row.amount);
          setDescription(row.description ?? '');
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message ?? t('errors.unknown'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  if (error || !txn) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
        <EmptyState
          icon="❓"
          title={t('transactions.notFound')}
          action={{ label: t('common.cancel'), onPress: () => router.back() }}
        />
      </SafeAreaView>
    );
  }

  const contact = txn.contact_id
    ? (contactsQ.data ?? []).find((c) => c.id === txn.contact_id) ?? null
    : null;
  const isIncome = txn.type === 'income';

  const onSave = async () => {
    const parsed = parseUserAmount(amount);
    if (parsed === null) {
      notify(t('app.name'), t('validation.amountInvalid'));
      return;
    }
    setSaving(true);
    try {
      const updated = await updateTransaction(txn.id, {
        amount: parsed,
        description: description.trim() ? description.trim() : null,
      });
      setTxn(updated);
      setAmount(updated.amount);
      setDescription(updated.description ?? '');
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['summary'] });
    } catch (err) {
      notify(t('app.name'), (err as Error).message ?? t('errors.unknown'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: t('transactions.delete'),
      message: t('transactions.deleteConfirm'),
      confirmLabel: t('transactions.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteTxn.mutateAsync(txn.id);
      router.back();
    } catch (err) {
      notify(t('app.name'), (err as Error).message ?? t('errors.unknown'));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-row items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <Button
          label={t('common.cancel')}
          variant="ghost"
          size="sm"
          onPress={() => (editing ? setEditing(false) : router.back())}
        />
        <Text
          accessibilityRole="header"
          className="flex-1 px-2 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50"
        >
          {isIncome ? t('quickAdd.income') : t('quickAdd.expense')}
        </Text>
        {editing ? (
          <View className="w-16" />
        ) : (
          <Button
            label={t('contacts.edit')}
            variant="ghost"
            size="sm"
            onPress={() => setEditing(true)}
          />
        )}
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 gap-5" keyboardShouldPersistTaps="handled">
        {!editing ? (
          <>
            <View>
              <Text
                className={`text-3xl font-bold ${isIncome ? 'text-income' : 'text-expense'}`}
              >
                {isIncome ? '+' : '−'}
                {formatMoney(txn.amount, txn.currency)}
              </Text>
              <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {formatDate(txn.occurred_at, 'long')}
              </Text>
            </View>

            {contact ? (
              <Field label={t('contacts.fullName')} value={contact.full_name} />
            ) : null}
            {txn.description ? (
              <Field label={t('quickAdd.description')} value={txn.description} />
            ) : null}

            <Button
              label={t('transactions.delete')}
              variant="danger"
              onPress={onDelete}
              loading={deleteTxn.isPending}
              fullWidth
            />
          </>
        ) : (
          <>
            <Input
              label={t('quickAdd.amount')}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              hint={`${txn.currency}`}
            />
            <Input
              label={t('quickAdd.description')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            <Button
              label={t('common.save')}
              onPress={onSave}
              loading={saving}
              fullWidth
              size="lg"
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </Text>
      <Text className="mt-1 text-base text-neutral-900 dark:text-neutral-100">{value}</Text>
    </View>
  );
}
