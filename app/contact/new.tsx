import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

import { ContactForm } from '@/components/ContactForm';
import { Button } from '@/components/ui/Button';
import { useCreateContact } from '@/hooks/useContacts';
import { notify } from '@/lib/confirm';
import { contactSchema } from '@/schemas/contact';
import { useAuthStore } from '@/stores/authStore';

export default function NewContactScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const createContact = useCreateContact();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-ink-900">
      <View className="flex-row items-center justify-between border-b border-ink-200 px-5 py-3 dark:border-ink-700">
        <Text
          accessibilityRole="header"
          className="text-lg font-semibold text-ink-900 dark:text-ink-50"
        >
          {t('contacts.addNew')}
        </Text>
        <Button
          label={t('common.cancel')}
          variant="ghost"
          size="sm"
          onPress={() => router.back()}
        />
      </View>

      <ScrollView contentContainerClassName="px-5 py-6" keyboardShouldPersistTaps="handled">
        <ContactForm
          submitLabel={t('common.save')}
          submitting={createContact.isPending}
          onSubmit={async (rawValues) => {
            if (!userId) {
              notify(t('app.name'), t('errors.unknown'));
              return;
            }
            const parsed = contactSchema.safeParse(rawValues);
            if (!parsed.success) return; // form-level errors already shown
            try {
              await createContact.mutateAsync({
                user_id: userId,
                full_name: parsed.data.full_name,
                phone_number: parsed.data.phone_number,
                occupation: parsed.data.occupation,
                notes: parsed.data.notes,
              });
              router.back();
            } catch (err) {
              notify(t('app.name'), (err as Error).message ?? t('errors.unknown'));
            }
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
