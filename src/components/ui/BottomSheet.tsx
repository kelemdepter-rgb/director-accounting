import type { PropsWithChildren } from 'react';
import { Modal, Pressable, SafeAreaView, Text, View } from 'react-native';

import { Button } from './Button';

interface BottomSheetProps extends PropsWithChildren {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Optional dismiss-label on the top-right corner (defaults to nothing). */
  closeLabel?: string;
}

/**
 * Lightweight modal bottom sheet — slides up from the bottom on native,
 * appears as a centered pane on the web.
 *
 * We intentionally do not pull in a heavy gesture library here: the sheet
 * is dismissed via the close button or by tapping the backdrop. Step 7
 * will add drag-to-dismiss if needed.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  closeLabel,
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
        className="flex-1 justify-end bg-black/50"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-3xl bg-white dark:bg-neutral-950"
        >
          <SafeAreaView>
            <View className="flex-row items-center justify-between px-5 pb-2 pt-4">
              <Text
                accessibilityRole="header"
                className="text-lg font-semibold text-neutral-900 dark:text-neutral-50"
              >
                {title}
              </Text>
              {closeLabel ? (
                <Button label={closeLabel} variant="ghost" size="sm" onPress={onClose} />
              ) : null}
            </View>
            <View className="px-5 pb-6 pt-2">{children}</View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
