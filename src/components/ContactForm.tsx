import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { contactSchema, type ContactFormValues } from '@/schemas/contact';

import { Button } from './ui/Button';
import { Input } from './ui/Input';

export interface ContactFormProps {
  initialValues?: Partial<ContactFormValues>;
  submitLabel: string;
  onSubmit: (values: ContactFormValues) => Promise<void> | void;
  onCancel?: () => void;
  submitting?: boolean;
}

const EMPTY_DEFAULTS: ContactFormValues = {
  full_name: '',
  phone_number: '',
  occupation: '',
  notes: '',
};

export function ContactForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  submitting = false,
}: ContactFormProps) {
  const { t } = useTranslation();

  const { control, handleSubmit, formState } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...initialValues },
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <View className="gap-4">
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
        name="phone_number"
        render={({ field, fieldState }) => (
          <Input
            label={t('contacts.phoneNumber')}
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
