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
  /** Render compactly inside a card or section instead of a full screen. */
  compact?: boolean;
}

export function EmptyState({ title, description, action, icon, compact = false }: EmptyStateProps) {
  return (
    <View
      accessibilityRole="summary"
      className={`items-center justify-center ${compact ? 'px-4 py-8' : 'px-6 py-16'}`}
    >
      {icon ? (
        <View
          className="mb-4 h-16 w-16 items-center justify-center rounded-3xl bg-ink-100 dark:bg-ink-800"
          accessibilityElementsHidden
        >
          <Text className="text-3xl">{icon}</Text>
        </View>
      ) : null}
      <Text className="text-center text-lg font-bold text-ink-900 dark:text-ink-50">
        {title}
      </Text>
      {description ? (
        <Text className="mt-2 max-w-md text-center text-sm leading-relaxed text-ink-500 dark:text-ink-400">
          {description}
        </Text>
      ) : null}
      {action ? (
        <View className="mt-6">
          <Button label={action.label} onPress={action.onPress} variant="primary" />
        </View>
      ) : null}
    </View>
  );
}
