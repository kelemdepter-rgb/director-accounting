import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { PressableCard } from '@/components/ui/Card';
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

  // Build a synthetic payment list from the totals on the view for the progress calc.
  const paid = Number(debt.paid_amount);
  const progress = paymentProgress(debt.principal_amount, [{ amount: paid }]);
  const progressPercent = Math.round(progress * 100);

  return (
    <PressableCard
      accent={accent}
      onPress={() => onPress?.(debt)}
      accessibilityLabel={`${isReceivable ? t('debts.receivable') : t('debts.payable')} ${formatMoney(debt.remaining_amount, debt.currency)} ${contactName ?? ''}`}
      className="gap-2"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {isReceivable ? t('debts.receivable') : t('debts.payable')}
        </Text>
        {debt.status === 'settled' ? (
          <Text className="text-xs font-semibold text-income">{t('debts.settled')}</Text>
        ) : (
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">
            {formatDate(debt.created_at, 'short')}
          </Text>
        )}
      </View>

      <View className="flex-row items-baseline justify-between">
        <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {contactName ?? '—'}
        </Text>
        <Text
          className={`text-xl font-bold ${isReceivable ? 'text-receivable' : 'text-payable'}`}
        >
          {formatMoney(debt.remaining_amount, debt.currency)}
        </Text>
      </View>

      {debt.principal_amount !== debt.remaining_amount ? (
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
          {t('debts.paidOf', {
            paid: formatMoney(debt.paid_amount, debt.currency),
            principal: formatMoney(debt.principal_amount, debt.currency),
          })}
        </Text>
      ) : (
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
          {t('debts.principal')}: {formatMoney(debt.principal_amount, debt.currency)}
        </Text>
      )}

      {debt.status === 'active' ? (
        <View className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <View
            accessibilityLabel={`${progressPercent}%`}
            className={`h-full ${isReceivable ? 'bg-receivable' : 'bg-payable'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </View>
      ) : null}

      {debt.description ? (
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
          {debt.description}
        </Text>
      ) : null}
    </PressableCard>
  );
}

export const DebtCard = memo(DebtCardImpl);
