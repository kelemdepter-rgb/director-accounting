import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/theme';
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
      <SafeAreaView className="flex-1 items-center justify-center bg-ink-50 dark:bg-ink-900">
        <ActivityIndicator size="large" color={colors.brand[500]} />
      </SafeAreaView>
    );
  }

  if (debtQ.isError || !debtQ.data) {
    return (
      <SafeAreaView className="flex-1 bg-ink-50 dark:bg-ink-900">
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
  const isSettled = debt.status === 'settled';
  const progress = paymentProgress(debt.principal_amount, [{ amount: debt.paid_amount }]);
  const progressPercent = Math.round(progress * 100);

  const heroBg = isSettled
    ? 'bg-ink-700'
    : isReceivable
      ? 'bg-income-500'
      : 'bg-payable-500';
  const sideIcon = isReceivable ? 'arrow-up-circle' : 'arrow-down-circle';

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
    <SafeAreaView className="flex-1 bg-ink-50 dark:bg-ink-900">
      {/* Hero header */}
      <View className={`px-5 pb-7 pt-3 ${heroBg}`}>
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <View className="flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
            <Ionicons name={sideIcon} size={14} color="#fff" />
            <Text className="text-xs font-semibold uppercase tracking-widest text-white">
              {isReceivable ? t('debts.receivable') : t('debts.payable')}
            </Text>
          </View>
          <View className="w-10" />
        </View>

        <View className="mt-4 items-center">
          <Text className="text-xs uppercase tracking-widest text-white/70">
            {contactQ.data?.full_name ?? '—'}
          </Text>
          <Text
            className="mt-1 text-4xl font-extrabold text-white"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatMoney(debt.remaining_amount, debt.currency)}
          </Text>
          <Text className="mt-1 text-xs text-white/80">
            {t('debts.paidOf', {
              paid: formatMoney(debt.paid_amount, debt.currency),
              principal: formatMoney(debt.principal_amount, debt.currency),
            })}
          </Text>

          <View className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
            <View
              accessibilityLabel={`${progressPercent}%`}
              className="h-full bg-white"
              style={{ width: `${progressPercent}%` }}
            />
          </View>

          <Text className="mt-2 text-xs text-white/70">
            {t('debts.openedOn', { date: formatDate(debt.created_at, 'long') })}
          </Text>

          {isSettled ? (
            <View className="mt-2 flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text className="text-xs font-semibold text-white">
                {t('debts.settled')}
                {debt.settled_at ? ` · ${formatDate(debt.settled_at, 'short')}` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <FlatList
        data={paymentsQ.data ?? []}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PaymentRow payment={item} currency={debt.currency} />}
        contentContainerClassName="pb-10"
        ListHeaderComponent={
          <View className="gap-4 px-5 py-5">
            {!isSettled ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    label={t('debts.partialPayment')}
                    variant="outline"
                    onPress={openPartial}
                    fullWidth
                    size="lg"
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label={t('debts.settleInFull')}
                    onPress={openFull}
                    fullWidth
                    size="lg"
                  />
                </View>
              </View>
            ) : null}

            {debt.description ? (
              <Card className="p-4">
                <Text className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-300">
                  {t('quickAdd.description')}
                </Text>
                <Text className="mt-2 text-base text-ink-700 dark:text-ink-200">
                  {debt.description}
                </Text>
              </Card>
            ) : null}

            <Text className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-300">
              {t('debts.payments')}
            </Text>
          </View>
        }
        ListEmptyComponent={
          paymentsQ.isLoading ? (
            <View className="items-center py-6">
              <ActivityIndicator color={colors.brand[500]} />
            </View>
          ) : (
            <View className="px-5">
              <Card className="p-4">
                <Text className="text-sm text-ink-500 dark:text-ink-300">
                  {t('debts.noPaymentsYet')}
                </Text>
              </Card>
            </View>
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
              leftIcon={<Ionicons name="trash-outline" size={18} color="#fff" />}
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
            <View className="rounded-xl bg-expense-50 px-3 py-2.5 dark:bg-expense-900/30">
              <Text className="text-sm font-medium text-expense-600 dark:text-expense-100">
                {paymentError}
              </Text>
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
    <View className="mx-5 mb-2 flex-row items-center justify-between rounded-2xl border border-ink-100 bg-white p-4 dark:border-ink-700 dark:bg-ink-800">
      <View className="flex-1 pr-3">
        <Text className="text-sm font-medium text-ink-900 dark:text-ink-50">
          {formatDate(payment.paid_at, 'long')}
        </Text>
        {payment.note ? (
          <Text className="mt-0.5 text-xs text-ink-500 dark:text-ink-300">
            {payment.note}
          </Text>
        ) : null}
      </View>
      <Text
        className="text-sm font-bold text-income-600"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        +{formatMoney(payment.amount, currency)}
      </Text>
    </View>
  );
}
