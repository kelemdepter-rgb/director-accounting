import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useContacts } from '@/hooks/useContacts';
import type { ContactRow } from '@/types/database';

function ContactRowItem({
  contact,
  onPress,
}: {
  contact: ContactRow;
  onPress: (c: ContactRow) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${contact.full_name}${contact.phone_number ? `, ${contact.phone_number}` : ''}`}
      onPress={() => onPress(contact)}
      className="flex-row items-center justify-between border-b border-neutral-100 px-5 py-3 active:bg-neutral-50 dark:border-neutral-800 dark:active:bg-neutral-800"
    >
      <View className="flex-1 pr-3">
        <Text className="text-base font-medium text-neutral-900 dark:text-neutral-100">
          {contact.full_name}
        </Text>
        {contact.phone_number || contact.occupation ? (
          <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
            {[contact.phone_number, contact.occupation].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
      <Text className="text-neutral-400">›</Text>
    </Pressable>
  );
}

export default function ContactsTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch, isFetching } = useContacts({ search });

  const onAdd = () => router.push('/contact/new');
  const onOpenContact = (c: ContactRow) => router.push({ pathname: '/contact/[id]', params: { id: c.id } });

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className="px-5 pb-3 pt-2">
        <TextInput
          accessibilityLabel={t('contacts.searchPlaceholder')}
          placeholder={t('contacts.searchPlaceholder')}
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          className="h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : isError ? (
        <EmptyState
          icon="⚠️"
          title={t('errors.unknown')}
          action={{ label: t('common.retry'), onPress: () => void refetch() }}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="👥"
          title={t('contacts.empty')}
          description={t('contacts.emptyDescription')}
          action={{ label: t('contacts.addNew'), onPress: onAdd }}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ContactRowItem contact={item} onPress={onOpenContact} />}
          refreshing={isFetching && !isLoading}
          onRefresh={() => void refetch()}
          initialNumToRender={20}
        />
      )}

      <View className="absolute bottom-6 right-6">
        <Button
          label={t('contacts.addNew')}
          onPress={onAdd}
          accessibilityLabel={t('contacts.addNew')}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
