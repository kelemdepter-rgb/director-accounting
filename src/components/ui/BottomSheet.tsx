import type { PropsWithChildren } from 'react';
import { Modal, Pressable, SafeAreaView, Text, View } from 'react-native';

import { Button } from './Button';

interface BottomSheetProps extends PropsWithChildren {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Optional dismiss-label on the top-right corner. */
  closeLabel?: string;
  /** Hide the drag handle (e.g. for full-height sheets). */
  hideHandle?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  closeLabel,
  hideHandle = false,
}: BottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        accessibilityLabel="dismiss"
        onPress={onClose}
        className="flex-1 justify-end bg-ink-950/60"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-3xl bg-white dark:bg-ink-900"
        >
          <SafeAreaView>
            {!hideHandle ? (
              <View className="items-center pt-3">
                <View className="h-1.5 w-12 rounded-full bg-ink-300 dark:bg-ink-700" />
              </View>
            ) : null}

            {title || closeLabel ? (
              <View className="flex-row items-center justify-between px-5 pb-1 pt-3">
                <Text
                  accessibilityRole="header"
                  className="text-lg font-bold text-ink-900 dark:text-ink-50"
                >
                  {title}
                </Text>
                {closeLabel ? (
                  <Button label={closeLabel} variant="ghost" size="sm" onPress={onClose} />
                ) : null}
              </View>
            ) : null}

            <View className="px-5 pb-6 pt-2">{children}</View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
