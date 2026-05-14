import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { signInSchema, type SignInValues } from '@/schemas/auth';
import { useAuthStore } from '@/stores/authStore';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const errorKey = useAuthStore((s) => s.errorKey);
  const clearError = useAuthStore((s) => s.clearError);

  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await signIn(values.email, values.password);
      router.replace('/(tabs)');
    } catch {
      // Error already set in the store; surfaced below.
    } finally {
      setSubmitting(false);
    }
  });

  const onGoogle = async () => {
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      // Error already set in the store.
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
            {t('auth.welcome')}
          </Text>
          <Text className="mt-2 text-base text-neutral-600 dark:text-neutral-400">
            {t('auth.loginSubtitle')}
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
                  autoComplete="current-password"
                  textContentType="password"
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

            <Link href="/(auth)/forgot-password" asChild>
              <Pressable className="self-end">
                <Text className="text-sm font-medium text-brand-600 dark:text-brand-300">
                  {t('auth.forgotPassword')}
                </Text>
              </Pressable>
            </Link>

            {errorKey ? (
              <View
                accessibilityLiveRegion="polite"
                className="rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/30"
              >
                <Text className="text-sm text-expense">{t(errorKey)}</Text>
              </View>
            ) : null}

            <Button
              label={t('auth.signIn')}
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
              {t('auth.noAccount')}
            </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text className="text-sm font-semibold text-brand-600 dark:text-brand-300">
                  {t('auth.signUp')}
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
