import { forwardRef, useState } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string;
  /** Render adornment on the right side (e.g. show/hide password toggle). */
  rightAdornment?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    hint,
    error,
    rightAdornment,
    onFocus,
    onBlur,
    accessibilityLabel,
    accessibilityHint,
    editable = true,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const hasError = !!error;

  const borderClass = hasError
    ? 'border-expense'
    : focused
      ? 'border-brand-500'
      : 'border-neutral-300 dark:border-neutral-700';

  return (
    <View className="w-full">
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </Text>
      ) : null}
      <View
        className={`flex-row items-center rounded-lg border ${borderClass} bg-white dark:bg-neutral-900 ${editable ? '' : 'opacity-60'}`}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={accessibilityHint ?? hint}
          editable={editable}
          placeholderTextColor="#9ca3af"
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className="h-12 flex-1 px-3 text-base text-neutral-900 dark:text-neutral-100"
          {...rest}
        />
        {rightAdornment ? <View className="pr-2">{rightAdornment}</View> : null}
      </View>
      {hasError ? (
        <Text className="mt-1 text-xs text-expense" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</Text>
      ) : null}
    </View>
  );
});
