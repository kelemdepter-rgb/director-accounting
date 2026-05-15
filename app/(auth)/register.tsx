import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/theme';
import { notify } from '@/lib/confirm';
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
        notify(t('app.name'), t('auth.confirmEmailNotice'));
        router.replace('/(auth)/login');
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      /* error already in store */
    } finally {
      setSubmitting(false);
    }
  });

  const onGoogle = async () => {
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      /* noop */
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <AuthScaffold title={t('auth.createYourAccount')} subtitle={t('auth.registerSubtitle')}>
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
            leftAdornment={
              <Ionicons name="mail-outline" size={20} color={colors.ink[400]} />
            }
            error={
              fieldState.error ? t(fieldState.error.message ?? 'errors.unknown') : undefined
            }
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
            leftAdornment={
              <Ionicons name="lock-closed-outline" size={20} color={colors.ink[400]} />
            }
            rightAdornment={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowPassword((v) => !v)}
                className="px-2 py-2"
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.ink[500]}
                />
              </Pressable>
            }
            error={
              fieldState.error ? t(fieldState.error.message ?? 'errors.unknown') : undefined
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
            leftAdornment={
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.ink[400]} />
            }
            error={
              fieldState.error ? t(fieldState.error.message ?? 'errors.unknown') : undefined
            }
          />
        )}
      />

      {errorKey ? (
        <View
          accessibilityLiveRegion="polite"
          className="rounded-xl bg-expense-50 px-3 py-2.5 dark:bg-expense-900/30"
        >
          <Text className="text-sm font-medium text-expense-600 dark:text-expense-100">
            {t(errorKey)}
          </Text>
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
        <View className="h-px flex-1 bg-ink-200 dark:bg-ink-700" />
        <Text className="text-xs uppercase tracking-widest text-ink-400 dark:text-ink-500">
          {t('auth.or')}
        </Text>
        <View className="h-px flex-1 bg-ink-200 dark:bg-ink-700" />
      </View>

      <Button
        label={t('auth.continueWithGoogle')}
        variant="outline"
        onPress={onGoogle}
        loading={googleSubmitting}
        leftIcon={<Ionicons name="logo-google" size={18} color="#EA4335" />}
        fullWidth
        size="lg"
      />

      <View className="mt-8 flex-row items-center justify-center gap-1">
        <Text className="text-sm text-ink-500 dark:text-ink-300">
          {t('auth.hasAccount')}
        </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text className="text-sm font-semibold text-brand-500 dark:text-brand-200">
              {t('auth.signIn')}
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthScaffold>
  );
}
