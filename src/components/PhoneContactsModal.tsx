import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { PhoneContact } from '@/lib/contacts';
import { filterPhoneContacts } from '@/lib/contacts';

import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';

interface PhoneContactsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (contact: PhoneContact) => void;
  contacts: readonly PhoneContact[];
  loading?: boolean;
}

function Row({
  item,
  onPress,
}: {
  item: PhoneContact;
  onPress: (item: PhoneContact) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${item.phoneNumber ? `, ${item.phoneNumber}` : ''}`}
      onPress={() => onPress(item)}
      className="flex-row items-center justify-between border-b border-ink-100 px-5 py-3 active:bg-ink-50 dark:border-ink-700 dark:active:bg-ink-700"
    >
      <View className="flex-1 pr-3">
        <Text className="text-base font-medium text-ink-900 dark:text-ink-100">
          {item.name}
        </Text>
        {item.phoneNumber ? (
          <Text className="mt-0.5 text-sm text-ink-500 dark:text-ink-300">
            {item.phoneNumber}
          </Text>
        ) : null}
      </View>
      <Text className="text-sm font-semibold text-brand-600 dark:text-brand-300">
        +
      </Text>
    </Pressable>
  );
}

export function PhoneContactsModal({
  visible,
  onClose,
  onSelect,
  contacts,
  loading = false,
}: PhoneContactsModalProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const filtered = useMemo<PhoneContact[]>(() => {
    if (query.trim().length === 0) return [...contacts];
    return filterPhoneContacts(contacts, query, 200);
  }, [contacts, query]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white dark:bg-ink-900">
        <View className="flex-row items-center justify-between border-b border-ink-200 px-5 py-3 dark:border-ink-700">
          <Text
            accessibilityRole="header"
            className="text-lg font-semibold text-ink-900 dark:text-ink-50"
          >
            {t('contacts.fromPhone')}
          </Text>
          <Button label={t('common.cancel')} variant="ghost" size="sm" onPress={onClose} />
        </View>

        <View className="px-5 py-3">
          <TextInput
            accessibilityLabel={t('contacts.searchPlaceholder')}
            placeholder={t('contacts.searchPlaceholder')}
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-base text-ink-900 dark:border-ink-700 dark:bg-ink-700 dark:text-ink-100"
          />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📭"
            title={t('contacts.empty')}
            description={t('contacts.emptyPhoneHint')}
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Row
                item={item}
                onPress={(picked) => {
                  onSelect(picked);
                  onClose();
                }}
              />
            )}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            maxToRenderPerBatch={30}
            windowSize={10}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
