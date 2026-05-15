import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';

import type { QuickAddMode } from './QuickAddSheet';

interface QuickAddPickerProps {
  visible: boolean;
  onClose: () => void;
  onPick: (mode: QuickAddMode) => void;
}

interface Choice {
  mode: QuickAddMode;
  icon: string;
  titleKey: string;
  subtitleKey: string;
  tone: 'income' | 'expense' | 'receivable' | 'payable';
}

const CHOICES: Choice[] = [
  {
    mode: 'income',
    icon: '🟢',
    titleKey: 'quickAdd.income',
    subtitleKey: 'quickAdd.incomeHint',
    tone: 'income',
  },
  {
    mode: 'expense',
    icon: '🔴',
    titleKey: 'quickAdd.expense',
    subtitleKey: 'quickAdd.expenseHint',
    tone: 'expense',
  },
  {
    mode: 'lend',
    icon: '➡️',
    titleKey: 'quickAdd.lend',
    subtitleKey: 'quickAdd.lendHint',
    tone: 'receivable',
  },
  {
    mode: 'borrow',
    icon: '⬅️',
    titleKey: 'quickAdd.borrow',
    subtitleKey: 'quickAdd.borrowHint',
    tone: 'payable',
  },
];

const toneClass: Record<Choice['tone'], string> = {
  income: 'border-l-4 border-l-income',
  expense: 'border-l-4 border-l-expense',
  receivable: 'border-l-4 border-l-receivable',
  payable: 'border-l-4 border-l-payable',
};

export function QuickAddPicker({ visible, onClose, onPick }: QuickAddPickerProps) {
  const { t } = useTranslation();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('quickAdd.pickerTitle')}
      closeLabel={t('common.cancel')}
    >
      <View className="gap-3">
        {CHOICES.map((choice) => (
          <Pressable
            key={choice.mode}
            accessibilityRole="button"
            accessibilityLabel={t(choice.titleKey)}
            accessibilityHint={t(choice.subtitleKey)}
            onPress={() => onPick(choice.mode)}
            className={`flex-row items-center gap-3 rounded-xl border border-ink-200 bg-white p-4 active:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:active:bg-ink-700 ${toneClass[choice.tone]}`}
          >
            <Text className="text-2xl">{choice.icon}</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-ink-900 dark:text-ink-50">
                {t(choice.titleKey)}
              </Text>
              <Text className="text-xs text-ink-500 dark:text-ink-300">
                {t(choice.subtitleKey)}
              </Text>
            </View>
            <Text className="text-ink-400">›</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}
