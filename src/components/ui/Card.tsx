import type { PropsWithChildren } from 'react';
import { Pressable, type PressableProps, View } from 'react-native';

import { shadows } from '@/constants/theme';

type Accent = 'brand' | 'income' | 'expense' | 'receivable' | 'payable' | 'none';
type Elevation = 'flat' | 'card' | 'elevated';

interface CardProps extends PropsWithChildren {
  accent?: Accent;
  elevation?: Elevation;
  className?: string;
}

const accentMap: Record<Accent, string> = {
  brand: 'border-l-4 border-l-brand-500',
  income: 'border-l-4 border-l-income-500',
  expense: 'border-l-4 border-l-expense-500',
  receivable: 'border-l-4 border-l-income-500',
  payable: 'border-l-4 border-l-payable-500',
  none: '',
};

const elevationToStyle = {
  flat: undefined,
  card: shadows.card,
  elevated: shadows.elevated,
} as const;

// Light: subtle slate border. Dark: a faint inner-glow border using white at
// low opacity, which renders cleaner on the navy bg than a flat slate stroke.
const BASE = 'rounded-2xl bg-white dark:bg-ink-800 border border-ink-100 dark:border-white/10';

export function Card({
  children,
  accent = 'none',
  elevation = 'card',
  className = '',
}: CardProps) {
  return (
    <View
      className={`${BASE} ${accentMap[accent]} ${className}`}
      style={elevationToStyle[elevation]}
    >
      {children}
    </View>
  );
}

interface PressableCardProps
  extends PressableProps,
    Pick<CardProps, 'accent' | 'className' | 'elevation'> {}

export function PressableCard({
  children,
  accent = 'none',
  elevation = 'card',
  className = '',
  ...rest
}: PressableCardProps) {
  return (
    <Pressable
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      style={elevationToStyle[elevation]}
      className={`${BASE} ${accentMap[accent]} active:opacity-90 ${className}`}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
