import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { ServiceBadge } from '@/components/ServiceBadge';
import { PressableCard } from '@/components/ui/Card';
import { colors } from '@/constants/theme';
import type { DebtWithBalanceRow } from '@/types/database';
import { formatMoney } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { paymentProgress } from '@/utils/debtCalculation';

interface DebtCardProps {
  debt: DebtWithBalanceRow;
  contactName?: string | null;
  onPress?: (debt: DebtWithBalanceRow) => void;
}

function DebtCardImpl({ debt, contactName, onPress }: DebtCardProps) {
  const { t } = useTranslation();
  const isReceivable = debt.type === 'receivable';
  const accent = isReceivable ? 'receivable' : 'payable';

  const paid = Number(debt.paid_amount);
  const progress = paymentProgress(debt.principal_amount, [{ amount: paid }]);
  const progressPercent = Math.round(progress * 100);
  const isSettled = debt.status === 'settled';

  const amountColor = isReceivable ? 'text-income-600' : 'text-payable-600';
  const progressBarColor = isReceivable ? 'bg-income-500' : 'bg-payable-500';
  const sideIcon = isReceivable ? 'arrow-up-circle' : 'arrow-down-circle';
  const sideTint = isReceivable ? colors.income : colors.payable;

  return (
    <PressableCard
      accent={accent}
      onPress={() => onPress?.(debt)}
      accessibilityLabel={`${isReceivable ? t('debts.receivable') : t('debts.payable')} ${formatMoney(debt.remaining_amount, debt.currency)} ${contactName ?? ''}`}
      className="gap-3 p-4"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons name={sideIcon} size={16} color={sideTint} />
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-300">
            {isReceivable ? t('debts.receivable') : t('debts.payable')}
          </Text>
          <ServiceBadge
            type={debt.service_type}
            other={debt.service_type_other}
          />
        </View>
        {isSettled ? (
          <View className="flex-row items-center gap-1 rounded-full bg-income-50 px-2 py-0.5 dark:bg-income-700/30">
            <Ionicons name="checkmark-circle" size={12} color={colors.income} />
            <Text className="text-[11px] font-semibold text-income-600 dark:text-income-100">
              {t('debts.settled')}
            </Text>
          </View>
        ) : (
          <Text className="text-xs text-ink-500 dark:text-ink-300">
            {formatDate(debt.created_at, 'short')}
          </Text>
        )}
      </View>

      <View className="flex-row items-baseline justify-between">
        <Text
          className="text-base font-semibold text-ink-900 dark:text-ink-50"
          numberOfLines={1}
        >
          {contactName ?? '—'}
        </Text>
        <Text
          className={`text-xl font-bold ${amountColor}`}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {formatMoney(debt.remaining_amount, debt.currency)}
        </Text>
      </View>

      {/* Progress bar (only meaningful while active) */}
      {!isSettled ? (
        <View>
          <View className="h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-700">
            <View
              accessibilityLabel={`${progressPercent}%`}
              className={`h-full ${progressBarColor}`}
              style={{ width: `${progressPercent}%` }}
            />
          </View>
          <Text className="mt-1.5 text-xs text-ink-500 dark:text-ink-300">
            {t('debts.paidOf', {
              paid: formatMoney(debt.paid_amount, debt.currency),
              principal: formatMoney(debt.principal_amount, debt.currency),
            })}
          </Text>
        </View>
      ) : null}

      {debt.description ? (
        <Text
          className="text-xs text-ink-500 dark:text-ink-300"
          numberOfLines={2}
        >
          {debt.description}
        </Text>
      ) : null}
    </PressableCard>
  );
}

export const DebtCard = memo(DebtCardImpl);
