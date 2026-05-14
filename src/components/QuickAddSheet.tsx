import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { ContactAutocomplete } from '@/components/ContactAutocomplete';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateDebt } from '@/hooks/useDebts';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { notify } from '@/lib/confirm';
import { useAuthStore } from '@/stores/authStore';
import type { ContactRow } from '@/types/database';
import { parseUserAmount } from '@/utils/currency';

/** Four entry points the FAB exposes. */
export type QuickAddMode = 'income' | 'expense' | 'lend' | 'borrow';

interface QuickAddSheetProps {
  visible: boolean;
  mode: QuickAddMode | null;
  onClose: () => void;
  defaultCurrency?: string;
  /** Optional pre-selected contact (e.g. from a contact detail screen). */
  initialContact?: ContactRow | null;
}

const MODE_TITLES: Record<QuickAddMode, string> = {
  income: 'quickAdd.income',
  expense: 'quickAdd.expense',
  lend: 'quickAdd.lend',
  borrow: 'quickAdd.borrow',
};

const MODE_REQUIRES_CONTACT: Record<QuickAddMode, boolean> = {
  income: false,
  expense: false,
  lend: true,
  borrow: true,
};

export function QuickAddSheet({
  visible,
  mode,
  onClose,
  defaultCurrency = 'USD',
  initialContact = null,
}: QuickAddSheetProps) {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);
  const createTransaction = useCreateTransaction();
  const createDebt = useCreateDebt();

  const [contact, setContact] = useState<ContactRow | null>(initialContact);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset form whenever the sheet is reopened with a new mode.
  const resetForm = () => {
    setContact(initialContact);
    setAmount('');
    setCurrency(defaultCurrency);
    setDescription('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!mode) {
    return <BottomSheet visible={visible} onClose={onClose} title="" />;
  }

  const requiresContact = MODE_REQUIRES_CONTACT[mode];
  const isDebtMode = mode === 'lend' || mode === 'borrow';

  const handleSubmit = async () => {
    setError(null);
    if (!userId) {
      setError(t('errors.unknown'));
      return;
    }
    const parsedAmount = parseUserAmount(amount);
    if (parsedAmount === null) {
      setError(t('validation.amountInvalid'));
      return;
    }
    if (requiresContact && !contact) {
      setError(t('validation.contactRequired'));
      return;
    }
    setSubmitting(true);
    try {
      if (isDebtMode) {
        await createDebt.mutateAsync({
          user_id: userId,
          contact_id: contact!.id,
          type: mode === 'lend' ? 'receivable' : 'payable',
          principal_amount: parsedAmount,
          currency,
          description: description.trim() ? description.trim() : null,
        });
      } else {
        await createTransaction.mutateAsync({
          user_id: userId,
          contact_id: contact?.id ?? null,
          type: mode === 'income' ? 'income' : 'expense',
          amount: parsedAmount,
          currency,
          description: description.trim() ? description.trim() : null,
        });
      }
      resetForm();
      onClose();
    } catch (err) {
      notify(t('app.name'), (err as Error).message ?? t('errors.unknown'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={t(MODE_TITLES[mode])}
      closeLabel={t('common.cancel')}
    >
      <View className="gap-4">
        <ContactAutocomplete
          label={requiresContact ? t('quickAdd.contactRequired') : t('quickAdd.contactOptional')}
          value={contact}
          onChange={setContact}
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              label={t('quickAdd.amount')}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              autoFocus
            />
          </View>
          <View className="w-32">
            <CurrencyPicker
              value={currency}
              onChange={setCurrency}
              label={t('quickAdd.currency')}
            />
          </View>
        </View>

        <Input
          label={t('quickAdd.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('quickAdd.descriptionPlaceholder')}
          multiline
          numberOfLines={2}
        />

        {error ? (
          <View
            accessibilityLiveRegion="polite"
            className="rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/30"
          >
            <Text className="text-sm text-expense">{error}</Text>
          </View>
        ) : null}

        <Button
          label={t('common.save')}
          onPress={handleSubmit}
          loading={submitting}
          fullWidth
          size="lg"
        />
      </View>
    </BottomSheet>
  );
}
