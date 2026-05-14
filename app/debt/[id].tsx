import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, SafeAreaView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useContact } from '@/hooks/useContacts';
import {
  useCreatePayment,
  useDebt,
  useDebtPayments,
  useDeleteDebt,
} from '@/hooks/useDebts';
import { confirm, notify } from '@/lib/confirm';
import { useAuthStore } from '@/stores/authStore';
import type { DebtPaymentRow } from '@/types/database';
import { formatMoney, parseUserAmount } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { paymentProgress, validatePayment } from '@/utils/debtCalculation';

export default function DebtDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);

  const debtQ = useDebt(id);
  const paymentsQ = useDebtPayments(id);
  const contactQ = useContact(debtQ.data?.contact_id);
  const createPayment = useCreatePayment();
  const deleteDebt = useDeleteDebt();

  const [paymentSheet, setPaymentSheet] = useState<'partial' | 'full' | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  if (debtQ.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  if (debtQ.isError || !debtQ.data) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
        <EmptyState
          icon="❓"
          title={t('debts.notFound')}
          action={{ label: t('common.retry'), onPress: () => void debtQ.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const debt = debtQ.data;
  const isReceivable = debt.type === 'receivable';
  const progress = paymentProgress(debt.principal_amount, [{ amount: debt.paid_amount }]);
  const progressPercent = Math.round(progress * 100);

  const openPartial = () => {
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentError(null);
    setPaymentSheet('partial');
  };

  const openFull = () => {
    setPaymentAmount(String(debt.remaining_amount));
    setPaymentNote('');
    setPaymentError(null);
    setPaymentSheet('full');
  };

  const submitPayment = async () => {
    setPaymentError(null);
    if (!userId) return;
    const parsed = parseUserAmount(paymentAmount);
    if (parsed === null) {
      setPaymentError(t('validation.amountInvalid'));
      return;
    }
    const validation = validatePayment(
      parsed,
      debt.principal_amount,
      paymentsQ.data?.map((p) => ({ amount: p.amount })) ?? [],
    );
    if (!validation.valid) {
      setPaymentError(
        validation.reason === 'exceeds_remaining'
          ? t('debts.exceedsRemaining', {
              remaining: formatMoney(debt.remaining_amount, debt.currency),
            })
          : t('validation.amountInvalid'),
      );
      return;
    }
    try {
      await createPayment.mutateAsync({
        debt_id: debt.id,
        user_id: userId,
        amount: validation.amount!,
        note: paymentNote.trim() ? paymentNote.trim() : null,
      });
      setPaymentSheet(null);
    } catch (err) {
      notify(t('app.name'), (err as Error).message ?? t('errors.unknown'));
    }
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: t('debts.delete'),
      message: t('debts.deleteConfirm'),
      confirmLabel: t('debts.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteDebt.mutateAsync(debt.id);
      router.back();
    } catch (err) {
      notify(t('app.name'), (err as Error).message ?? t('errors.unknown'));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-row items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <Button label={t('common.cancel')} variant="ghost" size="sm" onPress={() => router.back()} />
        <Text
          accessibilityRole="header"
          className="flex-1 px-2 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50"
          numberOfLines={1}
        >
          {isReceivable ? t('debts.receivable') : t('debts.payable')}
        </Text>
        <View className="w-16" />
      </View>

      <FlatList
        data={paymentsQ.data ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PaymentRow payment={item} currency={debt.currency} />}
        contentContainerClassName="pb-10"
        ListHeaderComponent={
          <View className="gap-4 px-5 py-5">
            <Card accent={isReceivable ? 'receivable' : 'payable'}>
              <Text className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {contactQ.data?.full_name ?? '—'}
              </Text>
              <Text
                className={`mt-1 text-3xl font-bold ${isReceivable ? 'text-receivable' : 'text-payable'}`}
              >
                {formatMoney(debt.remaining_amount, debt.currency)}
              </Text>
              <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {t('debts.paidOf', {
                  paid: formatMoney(debt.paid_amount, debt.currency),
                  principal: formatMoney(debt.principal_amount, debt.currency),
                })}
              </Text>
              <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <View
                  className={`h-full ${isReceivable ? 'bg-receivable' : 'bg-payable'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </View>
              <Text className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {t('debts.openedOn', { date: formatDate(debt.created_at, 'long') })}
              </Text>
              {debt.status === 'settled' ? (
                <Text className="mt-1 text-xs font-semibold text-income">
                  ✓ {t('debts.settled')}
                  {debt.settled_at ? ` · ${formatDate(debt.settled_at, 'long')}` : ''}
                </Text>
              ) : null}
              {debt.description ? (
                <Text className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                  {debt.description}
                </Text>
              ) : null}
            </Card>

            {debt.status === 'active' ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    label={t('debts.partialPayment')}
                    variant="secondary"
                    onPress={openPartial}
                    fullWidth
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label={t('debts.settleInFull')}
                    onPress={openFull}
                    fullWidth
                  />
                </View>
              </View>
            ) : null}

            <Text className="mt-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('debts.payments')}
            </Text>
          </View>
        }
        ListEmptyComponent={
          paymentsQ.isLoading ? (
            <View className="items-center py-6">
              <ActivityIndicator color="#4f46e5" />
            </View>
          ) : (
            <Text className="px-5 py-3 text-sm text-neutral-500 dark:text-neutral-400">
              {t('debts.noPaymentsYet')}
            </Text>
          )
        }
        ListFooterComponent={
          <View className="px-5 pt-6">
            <Button
              label={t('debts.delete')}
              variant="danger"
              onPress={onDelete}
              loading={deleteDebt.isPending}
              fullWidth
            />
          </View>
        }
      />

      <BottomSheet
        visible={paymentSheet !== null}
        onClose={() => setPaymentSheet(null)}
        title={
          paymentSheet === 'full' ? t('debts.settleInFull') : t('debts.partialPayment')
        }
        closeLabel={t('common.cancel')}
      >
        <View className="gap-4">
          <Input
            label={t('quickAdd.amount')}
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="decimal-pad"
            editable={paymentSheet !== 'full'}
            hint={
              paymentSheet === 'full'
                ? t('debts.fullAmountHint', {
                    amount: formatMoney(debt.remaining_amount, debt.currency),
                  })
                : t('debts.partialAmountHint', {
                    amount: formatMoney(debt.remaining_amount, debt.currency),
                  })
            }
          />
          <Input
            label={t('debts.noteOptional')}
            value={paymentNote}
            onChangeText={setPaymentNote}
            multiline
            numberOfLines={2}
          />
          {paymentError ? (
            <View className="rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/30">
              <Text className="text-sm text-expense">{paymentError}</Text>
            </View>
          ) : null}
          <Button
            label={t('common.save')}
            onPress={submitPayment}
            loading={createPayment.isPending}
            fullWidth
            size="lg"
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function PaymentRow({ payment, currency }: { payment: DebtPaymentRow; currency: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-neutral-100 px-5 py-3 dark:border-neutral-800">
      <View className="flex-1 pr-3">
        <Text className="text-sm text-neutral-900 dark:text-neutral-100">
          {formatDate(payment.paid_at, 'long')}
        </Text>
        {payment.note ? (
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {payment.note}
          </Text>
        ) : null}
      </View>
      <Text className="text-sm font-semibold text-income">
        +{formatMoney(payment.amount, currency)}
      </Text>
    </View>
  );
}

