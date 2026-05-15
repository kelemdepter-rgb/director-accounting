import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';

import { ContactAutocomplete } from '@/components/ContactAutocomplete';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { useCreateDebt } from '@/hooks/useDebts';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { notify } from '@/lib/confirm';
import { useAuthStore } from '@/stores/authStore';
import type { ContactRow } from '@/types/database';
import { parseLocaleAmount, SUPPORTED_CURRENCIES } from '@/utils/currency';

/** Four entry points the FAB exposes. */
export type QuickAddMode = 'income' | 'expense' | 'lend' | 'borrow';

interface QuickAddSheetProps {
  visible: boolean;
  mode: QuickAddMode | null;
  onClose: () => void;
  defaultCurrency?: string;
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

const MODE_THEME: Record<QuickAddMode, { pill: string; button: 'primary' | 'danger'; tag: string; amountColor: string }> = {
  income: {
    pill: 'bg-income-50 dark:bg-income-700/30',
    button: 'primary',
    tag: 'text-income-700 dark:text-income-100',
    amountColor: 'text-income-600',
  },
  expense: {
    pill: 'bg-expense-50 dark:bg-expense-900/30',
    button: 'danger',
    tag: 'text-expense-600 dark:text-expense-100',
    amountColor: 'text-expense-600',
  },
  lend: {
    pill: 'bg-brand-50 dark:bg-brand-900/30',
    button: 'primary',
    tag: 'text-brand-600 dark:text-brand-200',
    amountColor: 'text-brand-500',
  },
  borrow: {
    pill: 'bg-payable-50 dark:bg-payable-700/30',
    button: 'primary',
    tag: 'text-payable-700 dark:text-payable-100',
    amountColor: 'text-payable-600',
  },
};

// Show a curated subset as quick pills, plus the user's default if not in the list.
const QUICK_CURRENCY_PILLS = ['USD', 'EUR', 'TRY', 'CNY'] as const;

const I18N_TO_LOCALE: Record<string, string> = {
  en: 'en-US',
  tr: 'tr-TR',
  ug: 'ug',
};

function localeFor(language: string): string {
  return I18N_TO_LOCALE[language] ?? language;
}

export function QuickAddSheet({
  visible,
  mode,
  onClose,
  defaultCurrency = 'USD',
  initialContact = null,
}: QuickAddSheetProps) {
  const { t, i18n } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);
  const createTransaction = useCreateTransaction();
  const createDebt = useCreateDebt();

  const locale = useMemo(() => localeFor(i18n.language), [i18n.language]);

  const [contact, setContact] = useState<ContactRow | null>(initialContact);
  const [amount, setAmount] = useState('');
  // Raw input (without thousands separators) so re-focusing the field is
  // comfortable to edit — we only show the formatted version on blur.
  const [amountRaw, setAmountRaw] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset form whenever the sheet is reopened.
  useEffect(() => {
    if (visible) {
      setContact(initialContact);
      setAmount('');
      setAmountRaw('');
      setCurrency(defaultCurrency);
      setDescription('');
      setOccurredAt(new Date());
      setError(null);
    }
  }, [visible, initialContact, defaultCurrency]);

  if (!mode) {
    return <BottomSheet visible={visible} onClose={onClose} />;
  }

  const requiresContact = MODE_REQUIRES_CONTACT[mode];
  const isDebtMode = mode === 'lend' || mode === 'borrow';
  const theme = MODE_THEME[mode];

  const pillSet = QUICK_CURRENCY_PILLS.includes(currency as (typeof QUICK_CURRENCY_PILLS)[number])
    ? (QUICK_CURRENCY_PILLS as readonly string[])
    : [currency, ...QUICK_CURRENCY_PILLS];

  const handleSubmit = async () => {
    setError(null);
    if (!userId) {
      setError(t('errors.unknown'));
      return;
    }
    const parsedAmount = parseLocaleAmount(amount)?.value ?? null;
    if (parsedAmount === null) {
      setError(t('validation.amountInvalid'));
      return;
    }
    if (requiresContact && !contact) {
      setError(t('validation.contactRequired'));
      return;
    }
    if (!SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number]) && currency.length !== 3) {
      setError(t('validation.currencyInvalid'));
      return;
    }
    setSubmitting(true);
    try {
      const occurredAtIso = occurredAt.toISOString();
      if (isDebtMode) {
        await createDebt.mutateAsync({
          contact_id: contact!.id,
          type: mode === 'lend' ? 'receivable' : 'payable',
          principal_amount: parsedAmount,
          currency,
          description: description.trim() ? description.trim() : null,
          occurred_at: occurredAtIso,
        });
      } else {
        await createTransaction.mutateAsync({
          user_id: userId,
          contact_id: contact?.id ?? null,
          type: mode === 'income' ? 'income' : 'expense',
          amount: parsedAmount,
          currency,
          description: description.trim() ? description.trim() : null,
          occurred_at: occurredAtIso,
        });
      }
      onClose();
    } catch (err) {
      notify(t('app.name'), (err as Error).message ?? t('errors.unknown'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} closeLabel={t('common.cancel')}>
      <View className="gap-5">
        {/* Type pill badge */}
        <View className={`self-start rounded-full px-3 py-1.5 ${theme.pill}`}>
          <Text className={`text-xs font-semibold uppercase tracking-widest ${theme.tag}`}>
            {t(MODE_TITLES[mode])}
          </Text>
        </View>

        {/* Big centered amount */}
        <View className="items-center">
          <TextInput
            accessibilityLabel={t('quickAdd.amount')}
            placeholder="0"
            placeholderTextColor="#CBD5E1"
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              setAmountRaw(text);
            }}
            onFocus={() => {
              // Restore the raw user-entered string so editing isn't fighting
              // against thousands separators we just inserted on blur.
              if (amountRaw && amountRaw !== amount) setAmount(amountRaw);
            }}
            onBlur={() => {
              const parsed = parseLocaleAmount(amount);
              if (!parsed) return;
              try {
                const formatted = new Intl.NumberFormat(locale, {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: parsed.value % 1 === 0 ? 0 : 2,
                }).format(parsed.value);
                setAmount(formatted);
              } catch {
                // Locale not supported by ICU build → leave the raw value.
              }
            }}
            keyboardType="decimal-pad"
            autoFocus
            className={`text-center text-5xl font-extrabold ${amount ? theme.amountColor : 'text-ink-300 dark:text-ink-500'} dark:text-ink-50`}
            style={{ fontVariant: ['tabular-nums'], minWidth: 140 }}
          />
          <View className="mt-2 flex-row gap-2">
            {pillSet.map((code) => {
              const active = code === currency;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setCurrency(code)}
                  className={`rounded-full px-3 py-1 ${active ? 'bg-brand-500' : 'bg-ink-100 dark:bg-ink-800'}`}
                >
                  <Text
                    className={`text-xs font-semibold ${active ? 'text-white' : 'text-ink-700 dark:text-ink-200'}`}
                  >
                    {code}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Contact picker */}
        <ContactAutocomplete
          label={requiresContact ? t('quickAdd.contactRequired') : t('quickAdd.contactOptional')}
          value={contact}
          onChange={setContact}
        />

        {/* Date — defaults to today; blocked from picking a future date. */}
        <DateField
          label={t('quickAdd.date')}
          value={occurredAt}
          onChange={setOccurredAt}
        />

        {/* Description */}
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
            className="rounded-xl bg-expense-50 px-3 py-2.5 dark:bg-expense-900/30"
          >
            <Text className="text-sm font-medium text-expense-600 dark:text-expense-100">
              {error}
            </Text>
          </View>
        ) : null}

        <Button
          label={t('common.save')}
          onPress={handleSubmit}
          loading={submitting}
          variant={theme.button}
          fullWidth
          size="lg"
        />
      </View>
    </BottomSheet>
  );
}
