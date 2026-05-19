import { useColorScheme } from 'nativewind';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useCreateContact, useContacts } from '@/hooks/useContacts';
import { usePhoneContacts } from '@/hooks/usePhoneContacts';
import { addContactToDevice, type PhoneContact } from '@/lib/contacts';
import { useAuthStore } from '@/stores/authStore';
import type { ContactRow } from '@/types/database';

import { PermissionModal } from './PermissionModal';
import { PhoneContactsModal } from './PhoneContactsModal';

export interface ContactAutocompleteProps {
  /** Currently selected contact (display only). */
  value: ContactRow | null;
  onChange: (contact: ContactRow) => void;
  label?: string;
  placeholder?: string;
}

interface SuggestionItem {
  key: string;
  kind: 'saved' | 'phone' | 'create';
  label: string;
  sublabel?: string | null;
  saved?: ContactRow;
  phone?: PhoneContact;
  /** For `create` rows, the raw typed name to seed the new contact with. */
  newName?: string;
}

const MIN_QUERY_LEN = 2;
const MAX_RESULTS = 10;

export function ContactAutocomplete({
  value,
  onChange,
  label,
  placeholder,
}: ContactAutocompleteProps) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const userId = useAuthStore((s) => s.user?.id);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showPhoneList, setShowPhoneList] = useState(false);

  const enableSearch = query.trim().length >= MIN_QUERY_LEN;
  const savedContacts = useContacts({ search: query, enabled: enableSearch });
  const phone = usePhoneContacts();
  const createContact = useCreateContact();

  const suggestions = useMemo<SuggestionItem[]>(() => {
    if (!enableSearch) return [];
    const items: SuggestionItem[] = [];

    for (const c of savedContacts.data ?? []) {
      items.push({
        key: `saved:${c.id}`,
        kind: 'saved',
        label: c.full_name,
        sublabel: c.phone_number,
        saved: c,
      });
    }

    if (phone.permission === 'granted') {
      const savedNames = new Set((savedContacts.data ?? []).map((c) => c.full_name.toLowerCase()));
      for (const p of phone.search(query, MAX_RESULTS)) {
        if (!savedNames.has(p.name.toLowerCase())) {
          items.push({
            key: `phone:${p.id}`,
            kind: 'phone',
            label: p.name,
            sublabel: p.phoneNumber,
            phone: p,
          });
        }
      }
    }

    const trimmedQuery = query.trim();
    // The "+ Add" fallback fires only when the saved-contacts query has
    // actually settled (so we don't flash it while results are still loading)
    // and there is no exact name match in either source.
    const hasExactMatch = items.some(
      (it) => it.label.trim().toLowerCase() === trimmedQuery.toLowerCase(),
    );
    if (
      !savedContacts.isLoading &&
      !savedContacts.isFetching &&
      trimmedQuery.length >= MIN_QUERY_LEN &&
      !hasExactMatch
    ) {
      items.push({
        key: `create:${trimmedQuery.toLowerCase()}`,
        kind: 'create',
        label: trimmedQuery,
        newName: trimmedQuery,
      });
    }

    return items.slice(0, MAX_RESULTS + 1);
  }, [
    enableSearch,
    savedContacts.data,
    savedContacts.isLoading,
    savedContacts.isFetching,
    phone,
    query,
  ]);

  const onPickSaved = (contact: ContactRow) => {
    setQuery('');
    setFocused(false);
    onChange(contact);
  };

  const onPickPhone = async (p: PhoneContact) => {
    if (!userId) return;
    try {
      const created = await createContact.mutateAsync({
        user_id: userId,
        full_name: p.name,
        phone_number: p.phoneNumber ?? null,
      });
      setQuery('');
      setFocused(false);
      onChange(created);
    } catch {
      // The mutation surfaces error state via TanStack; UI shows it.
    }
  };

  const onPickCreate = async (newName: string) => {
    if (!userId) return;
    const trimmed = newName.trim();
    if (trimmed.length === 0) return;
    try {
      const created = await createContact.mutateAsync({
        user_id: userId,
        full_name: trimmed,
        phone_number: null,
      });
      setQuery('');
      setFocused(false);
      onChange(created);
      // Mirror to the device address book when the OS supports it and the
      // user has already granted permission. Silent on failure: the in-app
      // save has already succeeded.
      void addContactToDevice({ name: trimmed });
    } catch {
      // Error surface handled by the mutation; selection just won't happen.
    }
  };

  const openPhoneList = async () => {
    if (!phone.supported) return;
    if (phone.permission === 'granted') {
      setShowPhoneList(true);
      return;
    }
    setShowPermissionModal(true);
  };

  const onAllowPermission = async () => {
    setShowPermissionModal(false);
    const status = await phone.request();
    if (status === 'granted') {
      setShowPhoneList(true);
    }
  };

  return (
    <View className="w-full">
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-ink-700 dark:text-ink-300">
          {label}
        </Text>
      ) : null}

      <View className="flex-row items-center gap-2">
        <View
          className={`flex-1 rounded-xl border ${focused ? 'border-brand-500' : 'border-ink-200 dark:border-ink-700'} bg-white dark:bg-ink-700`}
        >
          <TextInput
            accessibilityLabel={label ?? t('contacts.searchPlaceholder')}
            placeholder={placeholder ?? (value ? value.full_name : t('contacts.searchPlaceholder'))}
            placeholderTextColor={isDark ? colors.ink[500] : colors.ink[400]}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCapitalize="words"
            className="h-12 px-3 text-base text-ink-900 dark:text-ink-100"
          />
        </View>
        {phone.supported ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('contacts.fromPhone')}
            onPress={openPhoneList}
            className="h-12 w-12 items-center justify-center rounded-lg bg-ink-100 active:bg-ink-200 dark:bg-ink-700 dark:active:bg-ink-700"
          >
            <Text className="text-xl">📇</Text>
          </Pressable>
        ) : null}
      </View>

      {value && !enableSearch ? (
        <View className="mt-2 flex-row items-center justify-between rounded-lg bg-brand-50 px-3 py-2 dark:bg-brand-900/30">
          <View>
            <Text className="text-sm font-medium text-brand-900 dark:text-brand-100">
              {value.full_name}
            </Text>
            {value.phone_number ? (
              <Text className="text-xs text-brand-700 dark:text-brand-300">
                {value.phone_number}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {enableSearch ? (
        <View className="mt-2 max-h-80 rounded-lg border border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-800">
          {savedContacts.isLoading ? (
            <View className="items-center justify-center px-3 py-4">
              <ActivityIndicator color="#4f46e5" />
            </View>
          ) : (
            suggestions.map((item) => {
              const isCreate = item.kind === 'create';
              const tagText = isCreate
                ? t('contacts.addInlineTag')
                : item.kind === 'phone'
                  ? t('contacts.fromPhoneTag')
                  : t('contacts.savedTag');
              const tagClass = isCreate
                ? 'text-income-600 dark:text-income-100'
                : item.kind === 'phone'
                  ? 'text-payable'
                  : 'text-brand-600 dark:text-brand-300';
              const labelClass = isCreate
                ? 'text-base font-semibold text-income-700 dark:text-income-200'
                : 'text-base text-ink-900 dark:text-ink-100';
              const labelText = isCreate
                ? t('contacts.addInline', { name: item.label })
                : item.label;
              const a11yLabel = isCreate
                ? t('contacts.addInline', { name: item.label })
                : `${item.label}${item.sublabel ? `, ${item.sublabel}` : ''}`;

              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={a11yLabel}
                  onPress={() => {
                    if (item.kind === 'saved' && item.saved) onPickSaved(item.saved);
                    else if (item.kind === 'phone' && item.phone) void onPickPhone(item.phone);
                    else if (item.kind === 'create' && item.newName)
                      void onPickCreate(item.newName);
                  }}
                  disabled={isCreate && createContact.isPending}
                  className="flex-row items-center justify-between border-b border-ink-100 px-3 py-3 last:border-b-0 active:bg-ink-50 dark:border-ink-700 dark:active:bg-ink-700"
                >
                  <View className="flex-1 pr-2">
                    <Text className={labelClass} numberOfLines={1}>
                      {labelText}
                    </Text>
                    {item.sublabel ? (
                      <Text className="text-xs text-ink-500 dark:text-ink-300">
                        {item.sublabel}
                      </Text>
                    ) : null}
                  </View>
                  {isCreate && createContact.isPending ? (
                    <ActivityIndicator color={colors.income} />
                  ) : (
                    <Text className={`text-xs font-semibold ${tagClass}`}>{tagText}</Text>
                  )}
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}

      <PermissionModal
        visible={showPermissionModal}
        onAllow={onAllowPermission}
        onDismiss={() => setShowPermissionModal(false)}
        previouslyDenied={phone.permission === 'denied'}
      />
      <PhoneContactsModal
        visible={showPhoneList}
        onClose={() => setShowPhoneList(false)}
        contacts={phone.contacts}
        loading={phone.loading}
        onSelect={(p) => void onPickPhone(p)}
      />
    </View>
  );
}
