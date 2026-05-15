import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import type { TransactionRow } from '@/types/database';
import { formatMoney } from '@/utils/currency';
import { formatDate } from '@/utils/date';

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
  const amountClass = isIncome ? 'text-income-600' : 'text-expense-600';
  const display = contactName ?? transaction.description ?? '—';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${transaction.type}, ${formatMoney(transaction.amount, transaction.currency)}${contactName ? `, ${contactName}` : ''}`}
      onPress={() => onPress?.(transaction)}
      disabled={!onPress}
      className="flex-row items-center gap-3 px-4 py-3 active:bg-ink-50 dark:active:bg-ink-700"
    >
      <Avatar name={display} size={40} />
      <View className="flex-1">
        <Text
          className="text-base font-semibold text-ink-900 dark:text-ink-50"
          numberOfLines={1}
        >
          {display}
        </Text>
        <Text className="mt-0.5 text-xs text-ink-500 dark:text-ink-300" numberOfLines={1}>
          {formatDate(transaction.occurred_at, 'short')}
          {transaction.description && contactName ? ` · ${transaction.description}` : ''}
        </Text>
      </View>
      <Text
        className={`text-base font-bold ${amountClass}`}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {sign}
        {formatMoney(transaction.amount, transaction.currency)}
      </Text>
    </Pressable>
  );
}

export const TransactionListItem = memo(TransactionListItemImpl);
