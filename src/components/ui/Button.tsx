import { forwardRef, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  type PressableProps,
  Text,
  View,
} from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
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
  primary: 'bg-income-500 active:bg-income-600',
  secondary: 'bg-ink-100 active:bg-ink-200 dark:bg-ink-800 dark:active:bg-ink-700',
  ghost: 'bg-transparent active:bg-ink-100 dark:active:bg-ink-800',
  danger: 'bg-expense-500 active:bg-expense-600',
  outline:
    'bg-white active:bg-ink-50 border border-ink-200 dark:bg-ink-900 dark:active:bg-ink-800 dark:border-ink-700',
};

const textByVariant: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-ink-900 dark:text-ink-50',
  ghost: 'text-brand-500 dark:text-brand-200',
  danger: 'text-white',
  outline: 'text-ink-900 dark:text-ink-50',
};

const containerBySize: Record<Size, string> = {
  sm: 'h-9 px-3 rounded-lg',
  md: 'h-11 px-4 rounded-xl',
  lg: 'h-14 px-5 rounded-2xl',
};

const textBySize: Record<Size, string> = {
  sm: 'text-sm font-semibold',
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
    onPressIn,
    onPressOut,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }} className={fullWidth ? 'w-full' : ''}>
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPressIn={(e) => {
          Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 40,
            bounciness: 0,
          }).start();
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 4,
          }).start();
          onPressOut?.(e);
        }}
        className={`flex-row items-center justify-center ${containerByVariant[variant]} ${containerBySize[size]} ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-60' : ''}`}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' || variant === 'danger' ? '#fff' : '#1E3A5F'}
          />
        ) : (
          <>
            {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
            <Text className={`${textByVariant[variant]} ${textBySize[size]}`}>{label}</Text>
            {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
});
