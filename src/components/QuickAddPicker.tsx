import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { colors } from '@/constants/theme';

import type { QuickAddMode } from './QuickAddSheet';

interface QuickAddPickerProps {
  visible: boolean;
  onClose: () => void;
  onPick: (mode: QuickAddMode) => void;
}

interface Choice {
  mode: QuickAddMode;
  /** Ionicons name. Emoji has rendering issues on RN-Web in dark mode. */
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  /** Tailwind classes for the card chrome (border + active state). */
  borderClass: string;
  /** i18n key for the title (verb phrase from the user's perspective). */
  titleKey: string;
  /** i18n key for the one-line clarification. */
  subtitleKey: string;
}

/**
 * The Round 2 prompt replaces the four flat verbs (borç verildi / alındı /
 * gider ödendi / gelir alındı) with four cards that pair an icon, a verb
 * phrase from the user's perspective, and a one-line clarification of
 * what the action does to the balance. DB enum values stay unchanged.
 */
const CHOICES: Choice[] = [
  {
    mode: 'lend',
    icon: 'arrow-down-circle',
    iconColor: colors.income,
    borderClass: 'border-income/30 active:bg-income-50 dark:active:bg-income-700/30',
    titleKey: 'quickAdd.card.lent_title',
    subtitleKey: 'quickAdd.card.lent_subtitle',
  },
  {
    mode: 'borrow',
    icon: 'arrow-up-circle',
    iconColor: colors.payable,
    borderClass: 'border-payable/30 active:bg-payable-50 dark:active:bg-payable-700/30',
    titleKey: 'quickAdd.card.borrowed_title',
    subtitleKey: 'quickAdd.card.borrowed_subtitle',
  },
  {
    mode: 'income',
    icon: 'cash-outline',
    iconColor: colors.brand[500],
    borderClass: 'border-brand-500/30 active:bg-brand-50 dark:active:bg-brand-900/30',
    titleKey: 'quickAdd.card.received_title',
    subtitleKey: 'quickAdd.card.received_subtitle',
  },
  {
    mode: 'expense',
    icon: 'card-outline',
    iconColor: colors.expense,
    borderClass: 'border-expense/30 active:bg-expense-50 dark:active:bg-expense-900/30',
    titleKey: 'quickAdd.card.paid_title',
    subtitleKey: 'quickAdd.card.paid_subtitle',
  },
];

const CARD_BREAKPOINT = 600;

export function QuickAddPicker({ visible, onClose, onPick }: QuickAddPickerProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const twoColumn = width >= CARD_BREAKPOINT;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('quickAdd.pickerTitle')}
      closeLabel={t('common.cancel')}
    >
      <View className={`gap-3 ${twoColumn ? 'flex-row flex-wrap' : ''}`}>
        {CHOICES.map((choice) => (
          <Pressable
            key={choice.mode}
            accessibilityRole="button"
            accessibilityLabel={t(choice.titleKey)}
            accessibilityHint={t(choice.subtitleKey)}
            onPress={() => onPick(choice.mode)}
            // On desktop / tablet, two columns × two rows. On phones, one
            // card per row per the prompt.
            style={twoColumn ? { width: '48%' } : undefined}
            className={`rounded-2xl border bg-white p-4 dark:bg-ink-800 ${choice.borderClass}`}
          >
            <View className="flex-row items-center gap-3">
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: choice.iconColor + '22' }}
              >
                <Ionicons name={choice.icon} size={22} color={choice.iconColor} />
              </View>
              <Text className="flex-1 text-base font-semibold text-ink-900 dark:text-ink-50">
                {t(choice.titleKey)}
              </Text>
            </View>
            <Text className="mt-2 text-xs leading-relaxed text-ink-500 dark:text-ink-300">
              {t(choice.subtitleKey)}
            </Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}
