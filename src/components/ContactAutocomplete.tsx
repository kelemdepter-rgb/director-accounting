import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useCreateContact, useContacts } from '@/hooks/useContacts';
import { usePhoneContacts } from '@/hooks/usePhoneContacts';
import type { PhoneContact } from '@/lib/contacts';
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
  kind: 'saved' | 'phone';
  label: string;
  sublabel?: string | null;
  saved?: ContactRow;
  phone?: PhoneContact;
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

    return items.slice(0, MAX_RESULTS);
  }, [enableSearch, savedContacts.data, phone, query]);

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
        <Text className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </Text>
      ) : null}

      <View className="flex-row items-center gap-2">
        <View
          className={`flex-1 rounded-lg border ${focused ? 'border-brand-500' : 'border-neutral-300 dark:border-neutral-700'} bg-white dark:bg-neutral-900`}
        >
          <TextInput
            accessibilityLabel={label ?? t('contacts.searchPlaceholder')}
            placeholder={placeholder ?? (value ? value.full_name : t('contacts.searchPlaceholder'))}
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCapitalize="words"
            className="h-12 px-3 text-base text-neutral-900 dark:text-neutral-100"
          />
        </View>
        {phone.supported ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('contacts.fromPhone')}
            onPress={openPhoneList}
            className="h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 active:bg-neutral-200 dark:bg-neutral-800 dark:active:bg-neutral-700"
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
        <View className="mt-2 max-h-80 rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          {savedContacts.isLoading ? (
            <View className="items-center justify-center px-3 py-4">
              <ActivityIndicator color="#4f46e5" />
            </View>
          ) : suggestions.length === 0 ? (
            <View className="px-3 py-4">
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                {t('contacts.noMatches')}
              </Text>
            </View>
          ) : (
            suggestions.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}${item.sublabel ? `, ${item.sublabel}` : ''}`}
                onPress={() => {
                  if (item.kind === 'saved' && item.saved) onPickSaved(item.saved);
                  else if (item.kind === 'phone' && item.phone) void onPickPhone(item.phone);
                }}
                className="flex-row items-center justify-between border-b border-neutral-100 px-3 py-3 last:border-b-0 active:bg-neutral-50 dark:border-neutral-800 dark:active:bg-neutral-800"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-base text-neutral-900 dark:text-neutral-100">
                    {item.label}
                  </Text>
                  {item.sublabel ? (
                    <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                      {item.sublabel}
                    </Text>
                  ) : null}
                </View>
                <Text
                  className={`text-xs font-semibold ${item.kind === 'phone' ? 'text-payable' : 'text-brand-600 dark:text-brand-300'}`}
                >
                  {item.kind === 'phone' ? t('contacts.fromPhoneTag') : t('contacts.savedTag')}
                </Text>
              </Pressable>
            ))
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
