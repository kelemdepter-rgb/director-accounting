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
            className={`flex-row items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 active:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:active:bg-neutral-800 ${toneClass[choice.tone]}`}
          >
            <Text className="text-2xl">{choice.icon}</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                {t(choice.titleKey)}
              </Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                {t(choice.subtitleKey)}
              </Text>
            </View>
            <Text className="text-neutral-400">›</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}
