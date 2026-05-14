import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ContactForm } from '@/components/ContactForm';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useContact, useDeleteContact, useUpdateContact } from '@/hooks/useContacts';
import { confirm, notify } from '@/lib/confirm';
import { contactSchema } from '@/schemas/contact';

export default function ContactDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const contactQ = useContact(id);
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const [editing, setEditing] = useState(false);

  if (contactQ.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  if (contactQ.isError || !contactQ.data) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
        <EmptyState
          icon="❓"
          title={t('contacts.notFound')}
          action={{ label: t('common.retry'), onPress: () => void contactQ.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const contact = contactQ.data;

  const onDelete = async () => {
    const ok = await confirm({
      title: t('contacts.delete'),
      message: t('contacts.deleteConfirm'),
      confirmLabel: t('contacts.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteContact.mutateAsync(contact.id);
      router.back();
    } catch (err) {
      notify(t('app.name'), (err as Error).message ?? t('errors.unknown'));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-row items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <Button
          label={t('common.cancel')}
          variant="ghost"
          size="sm"
          onPress={() => (editing ? setEditing(false) : router.back())}
        />
        <Text
          accessibilityRole="header"
          className="flex-1 px-2 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50"
          numberOfLines={1}
        >
          {contact.full_name}
        </Text>
        {editing ? (
          <View className="w-16" />
        ) : (
          <Button
            label={t('contacts.edit')}
            variant="ghost"
            size="sm"
            onPress={() => setEditing(true)}
          />
        )}
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 gap-6" keyboardShouldPersistTaps="handled">
        {editing ? (
          <ContactForm
            initialValues={{
              full_name: contact.full_name,
              phone_number: contact.phone_number ?? '',
              occupation: contact.occupation ?? '',
              notes: contact.notes ?? '',
            }}
            submitLabel={t('common.save')}
            submitting={updateContact.isPending}
            onCancel={() => setEditing(false)}
            onSubmit={async (rawValues) => {
              const parsed = contactSchema.safeParse(rawValues);
              if (!parsed.success) return;
              try {
                await updateContact.mutateAsync({
                  id: contact.id,
                  patch: {
                    full_name: parsed.data.full_name,
                    phone_number: parsed.data.phone_number,
                    occupation: parsed.data.occupation,
                    notes: parsed.data.notes,
                  },
                });
                setEditing(false);
              } catch (err) {
                notify(t('app.name'), (err as Error).message ?? t('errors.unknown'));
              }
            }}
          />
        ) : (
          <>
            <View className="gap-3">
              {contact.phone_number ? (
                <Field label={t('contacts.phoneNumber')} value={contact.phone_number} />
              ) : null}
              {contact.occupation ? (
                <Field label={t('contacts.occupation')} value={contact.occupation} />
              ) : null}
              {contact.notes ? (
                <Field label={t('contacts.notes')} value={contact.notes} />
              ) : null}
              {!contact.phone_number && !contact.occupation && !contact.notes ? (
                <Text className="text-base text-neutral-500 dark:text-neutral-400">
                  {t('contacts.noExtraInfo')}
                </Text>
              ) : null}
            </View>

            <View className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-900">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('contacts.balanceHeading')}
              </Text>
              <Text className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                {t('contacts.balancePlaceholder')}
              </Text>
            </View>

            <Button
              label={t('contacts.delete')}
              variant="danger"
              onPress={onDelete}
              loading={deleteContact.isPending}
              fullWidth
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </Text>
      <Text className="mt-1 text-base text-neutral-900 dark:text-neutral-100">{value}</Text>
    </View>
  );
}
