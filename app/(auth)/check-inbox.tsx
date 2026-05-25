/**
 * Round 5 §3 — "Check Your Inbox" landing after a sign-up that needs
 * email confirmation.
 *
 * Previously, signing up routed straight back to the login screen with a
 * generic toast. Friends who tried to register from their phones saw a
 * flicker, returned to a login form, never noticed the email (often
 * filtered as spam), and concluded "the app is broken." This screen
 * makes the next step explicit, echoes the email the user typed (so they
 * know where to look), and provides a Resend button so a missed first
 * email is recoverable without re-registering.
 */
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function CheckInboxScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const resend = useAuthStore((s) => s.resendSignUpEmail);
  const errorKey = useAuthStore((s) => s.errorKey);
  const clearError = useAuthStore((s) => s.clearError);

  const [submitting, setSubmitting] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);

  const handleResend = async () => {
    if (!email) return;
    clearError();
    setSubmitting(true);
    try {
      await resend(String(email));
      setSentAt(Date.now());
    } catch {
      /* error already in store, no extra work needed */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScaffold title={t('auth.checkInboxTitle')}>
      <View className="items-center gap-2 py-2">
        <View className="h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 dark:bg-brand-900/40">
          <Ionicons name="mail-open-outline" size={32} color={colors.brand[500]} />
        </View>
      </View>

      <Text className="text-center text-base text-ink-700 dark:text-ink-200">
        {t('auth.checkInboxBody', { email: String(email || '') })}
      </Text>

      <Text className="text-center text-xs text-ink-500 dark:text-ink-300">
        {t('auth.checkInboxSpamHint')}
      </Text>

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

      {sentAt && !errorKey ? (
        <View className="rounded-xl bg-income-50 px-3 py-2.5 dark:bg-income-700/30">
          <Text className="text-center text-sm font-medium text-income-700 dark:text-income-100">
            {t('auth.resendSent')}
          </Text>
        </View>
      ) : null}

      <Button
        label={t('auth.resendConfirmation')}
        onPress={handleResend}
        loading={submitting}
        variant="outline"
        leftIcon={
          <Ionicons name="refresh-outline" size={18} color={colors.brand[500]} />
        }
        fullWidth
        size="lg"
      />

      <Button
        label={t('auth.backToSignIn')}
        onPress={() => router.replace('/(auth)/login')}
        variant="ghost"
        fullWidth
        size="lg"
      />
    </AuthScaffold>
  );
}
