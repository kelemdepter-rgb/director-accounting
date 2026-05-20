import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/theme';
import { zodResolver } from '@/lib/zodResolver';
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
      /* error already in store */
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthScaffold
      title={t('auth.resetPassword')}
      subtitle={t('auth.resetPasswordInstructions')}
    >
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
            leftAdornment={
              <Ionicons name="mail-outline" size={20} color={colors.ink[400]} />
            }
            error={
              fieldState.error ? t(fieldState.error.message ?? 'errors.unknown') : undefined
            }
          />
        )}
      />

      {sentToEmail ? (
        <View
          accessibilityLiveRegion="polite"
          className="rounded-xl bg-income-50 px-3 py-2.5 dark:bg-income-700/20"
        >
          <Text className="text-sm font-medium text-income-700 dark:text-income-100">
            {t('auth.resetLinkSent', { email: sentToEmail })}
          </Text>
        </View>
      ) : null}

      {errorKey ? (
        <View className="rounded-xl bg-expense-50 px-3 py-2.5 dark:bg-expense-900/30">
          <Text className="text-sm font-medium text-expense-600 dark:text-expense-100">
            {t(errorKey)}
          </Text>
        </View>
      ) : null}

      <Button
        label={t('auth.sendResetLink')}
        onPress={onSubmit}
        loading={submitting || formState.isSubmitting}
        fullWidth
        size="lg"
      />

      <View className="mt-8 flex-row items-center justify-center">
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text className="text-sm font-semibold text-brand-500 dark:text-brand-200">
              ‹ {t('auth.signIn')}
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthScaffold>
  );
}
