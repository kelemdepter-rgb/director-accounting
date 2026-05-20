import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { Button } from './Button';

interface BottomSheetProps extends PropsWithChildren {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Optional dismiss-label on the top-right corner. */
  closeLabel?: string;
  /** Hide the drag handle (e.g. for full-height sheets). */
  hideHandle?: boolean;
  /**
   * If true, the body is wrapped in a ScrollView + KeyboardAvoidingView
   * so long forms (the QuickAddSheet entry flow on small phones) can
   * still reach every field once the soft keyboard is up. Round 3 §1.
   */
  scrollable?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  closeLabel,
  hideHandle = false,
  scrollable = false,
}: BottomSheetProps) {
  const header =
    !hideHandle || title || closeLabel ? (
      <>
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
      </>
    ) : null;

  const body = scrollable ? (
    <KeyboardAvoidingView
      // iOS: 'padding' lifts the sheet so the keyboard doesn't cover the
      // active input. Android handles soft input via adjustResize at the
      // OS level; 'height' here would double-shift and clip the top of
      // the sheet, so we leave it undefined.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ maxHeight: '92%' }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  ) : (
    <View className="px-5 pb-6 pt-2">{children}</View>
  );

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
            {header}
            {body}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
