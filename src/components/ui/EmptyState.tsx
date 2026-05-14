import { Text, View } from 'react-native';

import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  /** Optional emoji or short icon string to show above the title. */
  icon?: string;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <View
      accessibilityRole="summary"
      className="items-center justify-center px-6 py-12"
    >
      {icon ? (
        <Text className="mb-3 text-4xl" accessibilityElementsHidden>
          {icon}
        </Text>
      ) : null}
      <Text className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        {title}
      </Text>
      {description ? (
        <Text className="mt-2 max-w-md text-center text-sm text-neutral-600 dark:text-neutral-400">
          {description}
        </Text>
      ) : null}
      {action ? (
        <View className="mt-5">
          <Button label={action.label} onPress={action.onPress} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
