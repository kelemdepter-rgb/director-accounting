import type { PropsWithChildren } from 'react';
import { Pressable, type PressableProps, View } from 'react-native';

interface CardProps extends PropsWithChildren {
  /** Optional accent border on the left edge. */
  accent?: 'brand' | 'income' | 'expense' | 'receivable' | 'payable' | 'none';
  className?: string;
}

const accentMap: Record<NonNullable<CardProps['accent']>, string> = {
  brand: 'border-l-4 border-l-brand-500',
  income: 'border-l-4 border-l-income',
  expense: 'border-l-4 border-l-expense',
  receivable: 'border-l-4 border-l-receivable',
  payable: 'border-l-4 border-l-payable',
  none: '',
};

export function Card({ children, accent = 'none', className = '' }: CardProps) {
  return (
    <View
      className={`rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 ${accentMap[accent]} ${className}`}
    >
      {children}
    </View>
  );
}

interface PressableCardProps extends PressableProps, Pick<CardProps, 'accent' | 'className'> {}

export function PressableCard({
  children,
  accent = 'none',
  className = '',
  ...rest
}: PressableCardProps) {
  return (
    <Pressable
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      className={`rounded-2xl border border-neutral-200 bg-white p-4 active:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:active:bg-neutral-800 ${accentMap[accent]} ${className}`}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
