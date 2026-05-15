import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';

import { Button } from './ui/Button';

interface PermissionModalProps {
  visible: boolean;
  onAllow: () => void;
  onDismiss: () => void;
  /** True if the user previously denied — show a "denied" message and Settings hint. */
  previouslyDenied?: boolean;
}

/**
 * Shown BEFORE the OS contacts permission prompt. Explains why we need
 * the phone-book scope so the user is informed before tapping Allow.
 */
export function PermissionModal({
  visible,
  onAllow,
  onDismiss,
  previouslyDenied = false,
}: PermissionModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      accessibilityViewIsModal
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
        onPress={onDismiss}
        className="flex-1 items-center justify-center bg-black/50 px-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-ink-800"
        >
          <Text className="mb-3 text-4xl" accessibilityElementsHidden>
            📇
          </Text>
          <Text
            accessibilityRole="header"
            className="text-xl font-bold text-ink-900 dark:text-ink-50"
          >
            {t('contacts.permissionTitle')}
          </Text>
          <Text className="mt-3 text-base text-ink-600 dark:text-ink-300">
            {t('contacts.permissionExplain')}
          </Text>
          {previouslyDenied ? (
            <View className="mt-4 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/30">
              <Text className="text-sm text-amber-700 dark:text-amber-200">
                {t('contacts.permissionDenied')}
              </Text>
            </View>
          ) : null}

          <View className="mt-6 gap-3">
            <Button label={t('contacts.permissionGrant')} onPress={onAllow} fullWidth size="lg" />
            <Button
              label={t('contacts.permissionDeny')}
              onPress={onDismiss}
              variant="ghost"
              fullWidth
              size="lg"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
