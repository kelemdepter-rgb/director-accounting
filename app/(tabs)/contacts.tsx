import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/constants/theme';
import { useContacts } from '@/hooks/useContacts';
import type { ContactRow, ContactServiceType } from '@/types/database';
import { displayContact } from '@/utils/contact';

const SERVICE_TYPE_LABEL_KEY: Record<ContactServiceType, string> = {
  vize: 'contacts.serviceTypeVize',
  bilet: 'contacts.serviceTypeBilet',
  bilet_ve_vize: 'contacts.serviceTypeBiletVeVize',
};

function ContactRowItem({
  contact,
  onPress,
}: {
  contact: ContactRow;
  onPress: (c: ContactRow) => void;
}) {
  const { t } = useTranslation();
  const label = displayContact(contact);
  const hasName = !!contact.full_name?.trim();
  // When the name is the phone, omit it from the subtitle to avoid showing
  // the same string twice.
  const subtitleParts = [contact.occupation, hasName ? contact.phone_number : null].filter(Boolean);
  const subtitle = subtitleParts.join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}${hasName && contact.phone_number ? `, ${contact.phone_number}` : ''}`}
      onPress={() => onPress(contact)}
      className="mx-5 mb-2 flex-row items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3 active:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:active:bg-ink-700"
    >
      <Avatar name={label} size={44} />
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className="flex-shrink text-base font-semibold text-ink-900 dark:text-ink-50"
            numberOfLines={1}
          >
            {label}
          </Text>
          {contact.service_type ? (
            <View className="rounded-full bg-brand-50 px-2 py-0.5 dark:bg-brand-900/40">
              <Text className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-200">
                {t(SERVICE_TYPE_LABEL_KEY[contact.service_type])}
              </Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-ink-500 dark:text-ink-300" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.ink[400]} />
    </Pressable>
  );
}

function ContactSkeleton() {
  return (
    <View className="mx-5 mb-2 flex-row items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3 dark:border-ink-700 dark:bg-ink-800">
      <Skeleton width={44} height={44} radius={22} />
      <View className="flex-1 gap-1.5">
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={11} />
      </View>
    </View>
  );
}

export default function ContactsTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch, isFetching } = useContacts({ search });

  const onAdd = () => router.push('/contact/new');
  const onOpenContact = (c: ContactRow) =>
    router.push({ pathname: '/contact/[id]', params: { id: c.id } });

  return (
    <SafeAreaView className="flex-1 bg-ink-50 dark:bg-ink-900">
      <View className="px-5 pb-3 pt-2">
        <View className="flex-row items-center gap-2 rounded-2xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-700">
          <Ionicons name="search" size={18} color={colors.ink[400]} />
          <TextInput
            accessibilityLabel={t('contacts.searchPlaceholder')}
            placeholder={t('contacts.searchPlaceholder')}
            placeholderTextColor={colors.ink[400]}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            className="h-11 flex-1 text-base text-ink-900 dark:text-ink-50"
          />
          {search ? (
            <Pressable accessibilityRole="button" onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.ink[400]} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View className="mt-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <ContactSkeleton key={i} />
          ))}
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
          contentContainerClassName="pb-32 pt-1"
          initialNumToRender={20}
        />
      )}

      <View className="absolute bottom-6 right-6">
        <Button
          label={t('contacts.addNew')}
          onPress={onAdd}
          accessibilityLabel={t('contacts.addNew')}
          size="lg"
          leftIcon={<Ionicons name="person-add-outline" size={18} color="#fff" />}
        />
      </View>
    </SafeAreaView>
  );
}
