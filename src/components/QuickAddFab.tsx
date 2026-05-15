import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, Text, View } from 'react-native';

import { shadows } from '@/constants/theme';

import type { QuickAddMode } from './QuickAddSheet';

const CHOICES: {
  mode: QuickAddMode;
  emoji: string;
  labelKey: string;
  bg: string;
}[] = [
  { mode: 'income', emoji: '🟢', labelKey: 'quickAdd.income', bg: 'bg-income-500' },
  { mode: 'expense', emoji: '🔴', labelKey: 'quickAdd.expense', bg: 'bg-expense-500' },
  { mode: 'lend', emoji: '➡️', labelKey: 'quickAdd.lend', bg: 'bg-brand-500' },
  { mode: 'borrow', emoji: '⬅️', labelKey: 'quickAdd.borrow', bg: 'bg-payable-500' },
];

interface QuickAddFabProps {
  onPick: (mode: QuickAddMode) => void;
}

/**
 * Floating Action Button that fans out 4 labelled chips upward when tapped.
 * Each chip animates in with a staggered delay; the FAB icon rotates from
 * "+" to "×". Tapping the backdrop or the FAB collapses the menu.
 */
export function QuickAddFab({ onPick }: QuickAddFabProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      speed: 16,
      bounciness: 6,
    }).start();
  }, [open, progress]);

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      {/* Backdrop — captures taps anywhere outside the chips to close. */}
      {open ? (
        <Pressable
          accessibilityLabel={t('common.cancel')}
          onPress={() => setOpen(false)}
          className="absolute inset-0 bg-ink-950/30"
        />
      ) : null}

      <View className="absolute bottom-6 right-6 items-end gap-3">
        {/* Stagger the chips from the FAB up to the highest one. */}
        {[...CHOICES].reverse().map((choice, idx) => {
          const fromBottom = (idx + 1) * 60;
          const translateY = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [fromBottom, 0],
          });
          const opacity = progress.interpolate({
            inputRange: [0, 0.4, 1],
            outputRange: [0, 0, 1],
          });
          const scale = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.7, 1],
          });
          return (
            <Animated.View
              key={choice.mode}
              pointerEvents={open ? 'auto' : 'none'}
              style={{ opacity, transform: [{ translateY }, { scale }] }}
              className="flex-row items-center gap-3"
            >
              <View className="rounded-xl bg-white px-3 py-1.5 shadow dark:bg-ink-800">
                <Text className="text-sm font-semibold text-ink-900 dark:text-ink-50">
                  {t(choice.labelKey)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(choice.labelKey)}
                onPress={() => {
                  setOpen(false);
                  // Defer so the close animation has a frame to play.
                  setTimeout(() => onPick(choice.mode), 60);
                }}
                style={shadows.card}
                className={`h-12 w-12 items-center justify-center rounded-full ${choice.bg}`}
              >
                <Text className="text-base">{choice.emoji}</Text>
              </Pressable>
            </Animated.View>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('quickAdd.openPicker')}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((v) => !v)}
          style={shadows.fab}
          className="h-14 w-14 items-center justify-center rounded-full bg-income-500"
        >
          <Animated.Text
            className="text-3xl font-light text-white"
            style={{ transform: [{ rotate }], lineHeight: 32 }}
          >
            ＋
          </Animated.Text>
        </Pressable>
      </View>
    </>
  );
}
