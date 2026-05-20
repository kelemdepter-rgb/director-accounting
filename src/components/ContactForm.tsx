import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { zodResolver } from '@/lib/zodResolver';
import {
  contactSchema,
  type ContactFormValues,
  type ContactValues,
} from '@/schemas/contact';
import type { ContactServiceType } from '@/types/database';

import { Button } from './ui/Button';
import { Input } from './ui/Input';

export interface ContactFormProps {
  initialValues?: Partial<ContactFormValues>;
  submitLabel: string;
  /**
   * Called with the schema *output* (after trim + null-transform), so
   * consumers can persist `values` straight to the DB without re-parsing.
   */
  onSubmit: (values: ContactValues) => Promise<void> | void;
  onCancel?: () => void;
  submitting?: boolean;
}

const EMPTY_DEFAULTS: ContactFormValues = {
  full_name: '',
  phone_number: '',
  occupation: '',
  notes: '',
  service_type: null,
};

const SERVICE_TYPE_OPTIONS: { value: ContactServiceType; labelKey: string }[] = [
  { value: 'vize', labelKey: 'contacts.serviceTypeVize' },
  { value: 'bilet', labelKey: 'contacts.serviceTypeBilet' },
  { value: 'bilet_ve_vize', labelKey: 'contacts.serviceTypeBiletVeVize' },
];

export function ContactForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  submitting = false,
}: ContactFormProps) {
  const { t } = useTranslation();

  const { control, handleSubmit, formState } = useForm<
    ContactFormValues,
    unknown,
    ContactValues
  >({
    resolver: zodResolver(contactSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...initialValues },
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <View className="gap-4">
      {/*
        Phone moves to the top of the form because it is the only required
        field. The asterisk in the label matches the convention used by the
        auth screens.
      */}
      <Controller
        control={control}
        name="phone_number"
        render={({ field, fieldState }) => (
          <Input
            label={`${t('contacts.phoneNumber')} *`}
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            error={
              fieldState.error
                ? t(fieldState.error.message ?? 'errors.unknown')
                : undefined
            }
          />
        )}
      />

      <Controller
        control={control}
        name="full_name"
        render={({ field, fieldState }) => (
          <Input
            label={t('contacts.fullName')}
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="words"
            error={
              fieldState.error
                ? t(fieldState.error.message ?? 'errors.unknown')
                : undefined
            }
          />
        )}
      />

      <Controller
        control={control}
        name="occupation"
        render={({ field, fieldState }) => (
          <Input
            label={t('contacts.occupation')}
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={
              fieldState.error
                ? t(fieldState.error.message ?? 'errors.unknown')
                : undefined
            }
          />
        )}
      />

      {/*
        Service type — a single-select pill group matching the currency
        pill style used throughout the app. Tapping the same pill again
        clears the selection (NULL is a valid state).
      */}
      <Controller
        control={control}
        name="service_type"
        render={({ field }) => {
          const current = field.value ?? null;
          return (
            <View>
              <Text className="mb-1.5 text-sm font-medium text-ink-700 dark:text-ink-300">
                {t('contacts.serviceType')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {SERVICE_TYPE_OPTIONS.map((opt) => {
                  const active = current === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => field.onChange(active ? null : opt.value)}
                      className={`rounded-full px-4 py-2 ${
                        active
                          ? 'bg-brand-500'
                          : 'bg-ink-100 dark:bg-ink-700'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          active
                            ? 'text-white'
                            : 'text-ink-700 dark:text-ink-200'
                        }`}
                      >
                        {t(opt.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        }}
      />

      <Controller
        control={control}
        name="notes"
        render={({ field, fieldState }) => (
          <Input
            label={t('contacts.notes')}
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline
            numberOfLines={4}
            error={
              fieldState.error
                ? t(fieldState.error.message ?? 'errors.unknown')
                : undefined
            }
          />
        )}
      />

      <View className="mt-2 flex-row gap-3">
        {onCancel ? (
          <View className="flex-1">
            <Button
              label={t('common.cancel')}
              onPress={onCancel}
              variant="secondary"
              fullWidth
              size="lg"
            />
          </View>
        ) : null}
        <View className="flex-1">
          <Button
            label={submitLabel}
            onPress={submit}
            loading={submitting || formState.isSubmitting}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    </View>
  );
}
