import { forwardRef, useState } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string;
  /** Optional adornment shown on the LEFT (e.g. mail/lock/user icon). */
  leftAdornment?: React.ReactNode;
  /** Optional adornment shown on the RIGHT (e.g. password show/hide). */
  rightAdornment?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    hint,
    error,
    leftAdornment,
    rightAdornment,
    onFocus,
    onBlur,
    accessibilityLabel,
    accessibilityHint,
    editable = true,
    multiline,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const hasError = !!error;

  const borderClass = hasError
    ? 'border-expense-500'
    : focused
      ? 'border-brand-500 ring-2 ring-brand-100 dark:ring-brand-900'
      : 'border-ink-200 dark:border-ink-700';

  return (
    <View className="w-full">
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-ink-700 dark:text-ink-300">
          {label}
        </Text>
      ) : null}
      <View
        className={`flex-row items-center rounded-xl border bg-white dark:bg-ink-900 ${borderClass} ${editable ? '' : 'opacity-60'}`}
      >
        {leftAdornment ? <View className="pl-3">{leftAdornment}</View> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={accessibilityHint ?? hint}
          editable={editable}
          placeholderTextColor="#94A3B8"
          multiline={multiline}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className={`flex-1 ${multiline ? 'min-h-[80px] py-3' : 'h-12'} px-3 text-base text-ink-900 dark:text-ink-50`}
          {...rest}
        />
        {rightAdornment ? <View className="pr-2">{rightAdornment}</View> : null}
      </View>
      {hasError ? (
        <Text className="mt-1.5 text-xs text-expense-600" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text className="mt-1.5 text-xs text-ink-500 dark:text-ink-400">{hint}</Text>
      ) : null}
    </View>
  );
});
