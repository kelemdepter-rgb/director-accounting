import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { SUPPORTED_CURRENCIES } from '@/utils/currency';

import { Button } from './ui/Button';

interface CurrencyPickerProps {
  value: string;
  onChange: (currency: string) => void;
  label?: string;
}

export function CurrencyPicker({ value, onChange, label }: CurrencyPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <View>
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-ink-700 dark:text-ink-300">
          {label}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={t('common.tapToChange')}
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-lg border border-ink-300 bg-white px-3 py-3 active:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:active:bg-ink-700"
      >
        <Text className="text-base font-medium text-ink-900 dark:text-ink-100">
          {value}
        </Text>
        <Text className="text-ink-400">▾</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 items-center justify-center bg-black/50 px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-ink-800"
          >
            <SafeAreaView>
              <View className="flex-row items-center justify-between px-5 pb-2 pt-4">
                <Text
                  accessibilityRole="header"
                  className="text-base font-semibold text-ink-900 dark:text-ink-50"
                >
                  {label ?? t('common.choose')}
                </Text>
                <Button
                  label={t('common.cancel')}
                  variant="ghost"
                  size="sm"
                  onPress={() => setOpen(false)}
                />
              </View>
              <ScrollView className="max-h-80">
                {SUPPORTED_CURRENCIES.map((code) => {
                  const selected = code === value;
                  return (
                    <Pressable
                      key={code}
                      accessibilityRole="button"
                      accessibilityLabel={code}
                      accessibilityState={{ selected }}
                      onPress={() => {
                        onChange(code);
                        setOpen(false);
                      }}
                      className={`flex-row items-center justify-between px-5 py-3 active:bg-ink-50 dark:active:bg-ink-700 ${selected ? 'bg-brand-50 dark:bg-brand-900/30' : ''}`}
                    >
                      <Text
                        className={`text-base ${selected ? 'font-semibold text-brand-700 dark:text-brand-200' : 'text-ink-900 dark:text-ink-100'}`}
                      >
                        {code}
                      </Text>
                      {selected ? <Text className="text-brand-600">✓</Text> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
