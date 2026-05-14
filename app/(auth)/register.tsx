import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { signUpSchema, type SignUpValues } from '@/schemas/auth';
import { useAuthStore } from '@/stores/authStore';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const errorKey = useAuthStore((s) => s.errorKey);
  const clearError = useAuthStore((s) => s.clearError);

  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const { needsEmailConfirm } = await signUp(values.email, values.password);
      if (needsEmailConfirm) {
        Alert.alert(t('app.name'), t('auth.confirmEmailNotice'));
        router.replace('/(auth)/login');
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      // Error already in store.
    } finally {
      setSubmitting(false);
    }
  });

  const onGoogle = async () => {
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      // noop — error shown below.
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <ScrollView
        contentContainerClassName="grow justify-center px-6 py-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mx-auto w-full max-w-md">
          <Text className="text-xs uppercase tracking-wider text-brand-600 dark:text-brand-300">
            {t('app.name')}
          </Text>
          <Text
            accessibilityRole="header"
            className="mt-1 text-3xl font-bold text-neutral-900 dark:text-neutral-50"
          >
            {t('auth.createYourAccount')}
          </Text>
          <Text className="mt-2 text-base text-neutral-600 dark:text-neutral-400">
            {t('auth.registerSubtitle')}
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
                    field.onChange(text);
                  }}
                  onBlur={field.onBlur}
                  error={fieldState.error ? t(fieldState.error.message ?? 'errors.unknown') : undefined}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field, fieldState }) => (
                <Input
                  label={t('auth.password')}
                  placeholder={t('auth.passwordPlaceholder')}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  secureTextEntry={!showPassword}
                  value={field.value}
                  onChangeText={(text) => {
                    clearError();
                    field.onChange(text);
                  }}
                  onBlur={field.onBlur}
                  error={fieldState.error ? t(fieldState.error.message ?? 'errors.unknown') : undefined}
                  rightAdornment={
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      onPress={() => setShowPassword((v) => !v)}
                      className="px-2 py-2"
                    >
                      <Text className="text-xs font-medium text-brand-600 dark:text-brand-300">
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    </Pressable>
                  }
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <Input
                  label={t('auth.confirmPassword')}
                  placeholder={t('auth.passwordPlaceholder')}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  secureTextEntry={!showPassword}
                  value={field.value}
                  onChangeText={(text) => {
                    clearError();
                    field.onChange(text);
                  }}
                  onBlur={field.onBlur}
                  error={fieldState.error ? t(fieldState.error.message ?? 'errors.unknown') : undefined}
                />
              )}
            />

            {errorKey ? (
              <View
                accessibilityLiveRegion="polite"
                className="rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/30"
              >
                <Text className="text-sm text-expense">{t(errorKey)}</Text>
              </View>
            ) : null}

            <Button
              label={t('auth.signUp')}
              onPress={onSubmit}
              loading={submitting || formState.isSubmitting}
              fullWidth
              size="lg"
            />

            <View className="my-2 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
              <Text className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {t('auth.or')}
              </Text>
              <View className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            </View>

            <Button
              label={t('auth.continueWithGoogle')}
              variant="secondary"
              onPress={onGoogle}
              loading={googleSubmitting}
              fullWidth
              size="lg"
            />
          </View>

          <View className="mt-8 flex-row items-center justify-center gap-1">
            <Text className="text-sm text-neutral-600 dark:text-neutral-400">
              {t('auth.hasAccount')}
            </Text>
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
