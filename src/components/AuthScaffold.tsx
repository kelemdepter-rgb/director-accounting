import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { Logo } from './ui/Logo';

interface AuthScaffoldProps extends PropsWithChildren {
  title: string;
  subtitle: string;
}

const SPLIT_BREAKPOINT = 880;

/**
 * Shared layout for login / register / forgot-password.
 *
 * • Mobile (≤ 880 px): single-column with a brand header above the form.
 * • Wide screens: split — navy brand panel on the left, white form on the right.
 *
 * Keeping a single shared scaffold means every auth screen has the exact same
 * spacing, focus order, and brand treatment.
 */
export function AuthScaffold({ title, subtitle, children }: AuthScaffoldProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isSplit = width >= SPLIT_BREAKPOINT;

  const brand = (
    <View
      className={`bg-brand-500 ${isSplit ? 'h-full w-1/2 justify-center px-12' : 'px-6 py-10'}`}
    >
      {/* Decorative blurred circles to suggest "growth" without using images. */}
      {isSplit ? (
        <>
          <View
            className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-brand-400/30"
            accessibilityElementsHidden
          />
          <View
            className="absolute -bottom-40 -left-20 h-72 w-72 rounded-full bg-income/20"
            accessibilityElementsHidden
          />
        </>
      ) : null}
      <View className="flex-row items-center gap-3">
        <Logo size={isSplit ? 72 : 44} framed={isSplit} />
        <View>
          <Text className="text-2xl font-extrabold text-white">{t('app.name')}</Text>
          <Text className="mt-0.5 text-xs uppercase tracking-widest text-brand-100/80">
            {t('app.tagline')}
          </Text>
        </View>
      </View>
      {isSplit ? (
        <View className="mt-10 max-w-md">
          <Text className="text-3xl font-bold leading-snug text-white">
            {t('auth.brandHeadline')}
          </Text>
          <Text className="mt-3 text-base leading-relaxed text-brand-100/80">
            {t('auth.brandSub')}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const form = (
    <View className={`${isSplit ? 'h-full w-1/2 bg-white dark:bg-ink-950' : 'flex-1'}`}>
      <ScrollView
        contentContainerClassName="grow justify-center px-6 py-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mx-auto w-full max-w-md">
          <Text
            accessibilityRole="header"
            className="text-3xl font-bold text-ink-900 dark:text-ink-50"
          >
            {title}
          </Text>
          <Text className="mt-2 text-base leading-relaxed text-ink-500 dark:text-ink-400">
            {subtitle}
          </Text>

          <View className="mt-8 gap-4">{children}</View>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-ink-950">
      {isSplit ? (
        <View className="flex-1 flex-row">
          {brand}
          {form}
        </View>
      ) : (
        <View className="flex-1">
          {brand}
          {form}
        </View>
      )}
    </SafeAreaView>
  );
}
