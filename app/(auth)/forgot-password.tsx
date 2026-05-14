import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { resetPasswordSchema, type ResetPasswordValues } from '@/schemas/auth';
import { useAuthStore } from '@/stores/authStore';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const errorKey = useAuthStore((s) => s.errorKey);
  const clearError = useAuthStore((s) => s.clearError);

  const [submitting, setSubmitting] = useState(false);
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await resetPassword(values.email);
      setSentToEmail(values.email);
    } catch {
      // Error already in store.
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <ScrollView
        contentContainerClassName="grow justify-center px-6 py-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mx-auto w-full max-w-md">
          <Text
            accessibilityRole="header"
            className="text-3xl font-bold text-neutral-900 dark:text-neutral-50"
          >
            {t('auth.resetPassword')}
          </Text>
          <Text className="mt-2 text-base text-neutral-600 dark:text-neutral-400">
            {t('auth.resetPasswordInstructions')}
          </Text>

          <View className="mt-8 gap-4">
            <Controller
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <Input
                  label={t('auth.email')}
                  placeholder={t('auth.emailPlaceholder')}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  value={field.value}
                  onChangeText={(text) => {
                    clearError();
                    setSentToEmail(null);
                    field.onChange(text);
                  }}
                  onBlur={field.onBlur}
                  error={fieldState.error ? t(fieldState.error.message ?? 'errors.unknown') : undefined}
                />
              )}
            />

            {sentToEmail ? (
              <View
                accessibilityLiveRegion="polite"
                className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-900/30"
              >
                <Text className="text-sm text-emerald-700 dark:text-emerald-200">
                  {t('auth.resetLinkSent', { email: sentToEmail })}
                </Text>
              </View>
            ) : null}

            {errorKey ? (
              <View
                accessibilityLiveRegion="polite"
                className="rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/30"
              >
                <Text className="text-sm text-expense">{t(errorKey)}</Text>
              </View>
            ) : null}

            <Button
              label={t('auth.sendResetLink')}
              onPress={onSubmit}
              loading={submitting || formState.isSubmitting}
              fullWidth
              size="lg"
            />
          </View>

          <View className="mt-8 flex-row items-center justify-center">
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text className="text-sm font-semibold text-brand-600 dark:text-brand-300">
                  {t('auth.signIn')}
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
