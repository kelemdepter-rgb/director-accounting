import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  Text,
  View,
} from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const containerByVariant: Record<Variant, string> = {
  primary: 'bg-brand-600 active:bg-brand-700 dark:bg-brand-500 dark:active:bg-brand-400',
  secondary:
    'bg-neutral-100 active:bg-neutral-200 dark:bg-neutral-800 dark:active:bg-neutral-700',
  ghost: 'bg-transparent active:bg-neutral-100 dark:active:bg-neutral-800',
  danger: 'bg-expense active:bg-red-700',
};

const textByVariant: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-neutral-900 dark:text-neutral-100',
  ghost: 'text-brand-600 dark:text-brand-300',
  danger: 'text-white',
};

const containerBySize: Record<Size, string> = {
  sm: 'h-9 px-3 rounded-md',
  md: 'h-11 px-4 rounded-lg',
  lg: 'h-14 px-5 rounded-xl',
};

const textBySize: Record<Size, string> = {
  sm: 'text-sm font-medium',
  md: 'text-base font-semibold',
  lg: 'text-base font-semibold',
};

export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    label,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    fullWidth = false,
    leftIcon,
    rightIcon,
    accessibilityLabel,
    accessibilityHint,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${containerByVariant[variant]} ${containerBySize[size]} ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-60' : ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : undefined} />
      ) : (
        <>
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          <Text className={`${textByVariant[variant]} ${textBySize[size]}`}>{label}</Text>
          {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
});
