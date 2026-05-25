import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, Text, View } from 'react-native';

import { ContactForm } from '@/components/ContactForm';
import { ScreenScroll } from '@/components/ScreenScroll';
import { Button } from '@/components/ui/Button';
import { useCreateContact } from '@/hooks/useContacts';
import { notify } from '@/lib/confirm';
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

      <ScreenScroll
        insideTabs={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24 }}
      >
        <ContactForm
          submitLabel={t('common.save')}
          submitting={createContact.isPending}
          onSubmit={async (values) => {
            // `values` has already been parsed & transformed by the form's
            // zodResolver. Re-running safeParse here is what made the
            // previous round's "only Telefon required" fix not stick — the
            // re-parse choked on the transformed nulls and silently
            // returned. Trust RHF's output and pass it straight through.
            if (!userId) {
              notify(t('app.name'), t('errors.unknown'));
              return;
            }
            try {
              await createContact.mutateAsync({
                user_id: userId,
                full_name: values.full_name ?? null,
                phone_number: values.phone_number,
                occupation: values.occupation ?? null,
                notes: values.notes ?? null,
              });
              router.back();
            } catch (err) {
              notify(t('app.name'), (err as Error).message ?? t('errors.unknown'));
            }
          }}
        />
      </ScreenScroll>
    </SafeAreaView>
  );
}
