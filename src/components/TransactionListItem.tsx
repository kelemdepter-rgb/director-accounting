import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatDate } from '@/utils/date';
import type { TransactionRow } from '@/types/database';
import { formatMoney } from '@/utils/currency';

interface TransactionListItemProps {
  transaction: TransactionRow;
  contactName?: string | null;
  onPress?: (txn: TransactionRow) => void;
}

function TransactionListItemImpl({
  transaction,
  contactName,
  onPress,
}: TransactionListItemProps) {
  const isIncome = transaction.type === 'income';
  const sign = isIncome ? '+' : '−';
  const amountClass = isIncome ? 'text-income' : 'text-expense';
  const accentDotClass = isIncome ? 'bg-income' : 'bg-expense';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${transaction.type}, ${formatMoney(transaction.amount, transaction.currency)}${contactName ? `, ${contactName}` : ''}`}
      onPress={() => onPress?.(transaction)}
      disabled={!onPress}
      className="flex-row items-center justify-between border-b border-neutral-100 px-5 py-3 active:bg-neutral-50 dark:border-neutral-800 dark:active:bg-neutral-800"
    >
      <View className="flex-row items-center gap-3">
        <View className={`h-2 w-2 rounded-full ${accentDotClass}`} />
        <View>
          <Text className="text-base font-medium text-neutral-900 dark:text-neutral-100">
            {contactName ?? (transaction.description ?? '—')}
          </Text>
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {formatDate(transaction.occurred_at, 'short')}
            {transaction.description && contactName ? ` · ${transaction.description}` : ''}
          </Text>
        </View>
      </View>
      <Text className={`text-base font-semibold ${amountClass}`}>
        {sign}
        {formatMoney(transaction.amount, transaction.currency)}
      </Text>
    </Pressable>
  );
}

export const TransactionListItem = memo(TransactionListItemImpl);
