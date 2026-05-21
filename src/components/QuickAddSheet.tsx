import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';

import { ContactAutocomplete } from '@/components/ContactAutocomplete';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/theme';
import { useCreateDebt, useDebts } from '@/hooks/useDebts';
import { useCreateTransaction, useTransactions } from '@/hooks/useTransactions';
import { notify } from '@/lib/confirm';
import { useAuthStore } from '@/stores/authStore';
import type { ContactRow } from '@/types/database';
import { formatMoney, SUPPORTED_CURRENCIES } from '@/utils/currency';
import { aggregateContactBalance } from '@/utils/debtCalculation';
import {
  formatAmountInput,
  parseAmount,
  spellAmount,
  type AppLocale,
  type SpellCurrency,
  type SpellLocale,
} from '@/utils/formatAmount';

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

// Show a curated subset as quick pills, plus the user's default if not in the
// list. Ordered with TRY first since this app's primary market is Turkey.
const QUICK_CURRENCY_PILLS = ['TRY', 'USD', 'EUR', 'CNY'] as const;

const I18N_TO_LOCALE: Record<string, string> = {
  en: 'en-US',
  tr: 'tr-TR',
  ug: 'ug',
};

function localeFor(language: string): string {
  return I18N_TO_LOCALE[language] ?? language;
}

const APP_LOCALES: readonly AppLocale[] = ['tr', 'en', 'ug'];
const SPELL_LOCALES: readonly SpellLocale[] = ['tr', 'en', 'ug'];
const SPELL_CURRENCIES: readonly SpellCurrency[] = ['TRY', 'USD', 'EUR', 'CNY'];

function appLocaleFor(language: string): AppLocale {
  return APP_LOCALES.includes(language as AppLocale)
    ? (language as AppLocale)
    : 'en';
}

function spellLocaleFor(language: string): SpellLocale {
  return SPELL_LOCALES.includes(language as SpellLocale)
    ? (language as SpellLocale)
    : 'en';
}

function spellCurrencyFor(code: string): SpellCurrency | null {
  return SPELL_CURRENCIES.includes(code as SpellCurrency)
    ? (code as SpellCurrency)
    : null;
}

export function QuickAddSheet({
  visible,
  mode,
  onClose,
  defaultCurrency = 'TRY',
  initialContact = null,
}: QuickAddSheetProps) {
  const { t, i18n } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const userId = useAuthStore((s) => s.user?.id);
  const createTransaction = useCreateTransaction();
  const createDebt = useCreateDebt();

  const locale = useMemo(() => localeFor(i18n.language), [i18n.language]);
  const appLocale = useMemo(() => appLocaleFor(i18n.language), [i18n.language]);
  const spellLocale = useMemo(() => spellLocaleFor(i18n.language), [i18n.language]);

  const [contact, setContact] = useState<ContactRow | null>(initialContact);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The "İşlem özeti" preview needs the contact's current balances. Only
  // fetch once a contact has been picked — we don't want to fire two
  // queries every time the FAB opens without one.
  const previewDebtsQ = useDebts({
    contactId: contact?.id,
    enabled: !!contact?.id && visible,
  });
  const previewTxnQ = useTransactions({
    contactId: contact?.id,
    enabled: !!contact?.id && visible,
  });
  const currentBalances = useMemo(() => {
    if (!contact) return {};
    return aggregateContactBalance(
      previewDebtsQ.data ?? [],
      previewTxnQ.data ?? [],
    );
  }, [contact, previewDebtsQ.data, previewTxnQ.data]);

  // Reset form whenever the sheet is reopened.
  useEffect(() => {
    if (visible) {
      setContact(initialContact);
      setAmount('');
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
    const parsedAmount = parseAmount(amount, appLocale);
    // Per the Round 2 prompt, the only amount-related warning we surface
    // is "must be > 0". The earlier "amountInvalid" warning that appeared
    // mid-typing is gone — formatAmountInput already coerces whatever the
    // user types into a valid representation.
    if (parsedAmount === null || parsedAmount <= 0) {
      setError(t('validation.amountMustBePositive'));
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
    <BottomSheet
      visible={visible}
      onClose={onClose}
      closeLabel={t('common.cancel')}
      scrollable
    >
      <View className="gap-5">
        {/* Type pill badge */}
        <View className={`self-start rounded-full px-3 py-1.5 ${theme.pill}`}>
          <Text className={`text-xs font-semibold uppercase tracking-widest ${theme.tag}`}>
            {t(MODE_TITLES[mode])}
          </Text>
        </View>

        {/* Big centered amount with live formatting + spell-out below */}
        <View className="items-center">
          <TextInput
            accessibilityLabel={t('quickAdd.amount')}
            placeholder="0"
            placeholderTextColor={isDark ? colors.ink[600] : colors.ink[300]}
            value={amount}
            onChangeText={(text) => {
              // Live-format every keystroke so the user always sees the
              // canonical thousand-separated representation. The previous
              // behaviour deferred this to blur, but that allowed
              // "invalid amount" warnings to appear mid-typing — the
              // Round 2 prompt wants those gone.
              setAmount(formatAmountInput(text, appLocale));
            }}
            keyboardType="decimal-pad"
            autoFocus
            className={`text-center text-5xl font-extrabold ${amount ? theme.amountColor : 'text-ink-300 dark:text-ink-600'} dark:text-ink-50`}
            style={{ fontVariant: ['tabular-nums'], minWidth: 140 }}
          />
          {/* Spell-out — empty until the user has typed a non-zero value
              with a supported currency. Falls back to silence for
              currencies we don't have words for (e.g. GBP). */}
          {(() => {
            const numeric = parseAmount(amount, appLocale);
            const sc = spellCurrencyFor(currency);
            if (numeric === null || numeric <= 0 || sc === null) return null;
            const phrase = spellAmount(numeric, sc, spellLocale);
            return (
              <Text
                accessibilityLiveRegion="polite"
                className="mt-1 text-center text-xs text-ink-500 dark:text-ink-300"
              >
                {phrase}
              </Text>
            );
          })()}
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

        {/* Live "İşlem özeti" preview — shows how the selected mode +
            typed amount will change this contact's balance. Only render
            when both a contact and a positive amount are present, since
            the projection is meaningless otherwise. */}
        {(() => {
          const numeric = parseAmount(amount, appLocale);
          if (!contact || numeric === null || numeric <= 0) return null;

          // Simulate the action by appending a synthetic debt or transaction
          // and re-running aggregateContactBalance. This guarantees the
          // preview matches exactly what the server-side view will compute,
          // including overflow flips when cash_in exceeds receivable or
          // cash_out exceeds payable (Round 3 §5).
          const debts = previewDebtsQ.data ?? [];
          const txns = previewTxnQ.data ?? [];
          let projDebts = debts as Parameters<typeof aggregateContactBalance>[0];
          let projTxns = txns as Parameters<typeof aggregateContactBalance>[1];

          if (mode === 'lend' || mode === 'borrow') {
            projDebts = [
              ...debts,
              {
                type: mode === 'lend' ? 'receivable' : 'payable',
                status: 'active',
                currency,
                principal_amount: numeric,
                remaining_amount: numeric,
              },
            ];
          } else {
            projTxns = [
              ...txns,
              {
                type: mode === 'income' ? 'income' : 'expense',
                currency,
                amount: numeric,
                auto_generated: false,
              },
            ];
          }

          const projected = aggregateContactBalance(projDebts, projTxns);
          const cur = currentBalances[currency] ?? { receivable: 0, payable: 0, net: 0 };
          const next = projected[currency] ?? { receivable: 0, payable: 0, net: 0 };

          const recChanged = Math.abs(next.receivable - cur.receivable) > 0.005;
          const payChanged = Math.abs(next.payable - cur.payable) > 0.005;

          // Overflow detection: a cash_in beyond receivable spills into
          // payable; a cash_out beyond payable spills into receivable.
          // The user sees both sides change in that case, and we tell
          // them how much spilled over.
          let overflow = 0;
          if (mode === 'income') {
            // raw_rec_after = gross_rec - (paid_in + numeric). Overflow
            // = numeric - max(0, paid_in_room) where paid_in_room is
            // how much of `numeric` lands on the receivable side.
            const paidInRoom = Math.max(0, cur.receivable);
            overflow = Math.max(0, numeric - paidInRoom);
          } else if (mode === 'expense') {
            const paidOutRoom = Math.max(0, cur.payable);
            overflow = Math.max(0, numeric - paidOutRoom);
          }

          return (
            <View className="rounded-xl border border-ink-200 bg-ink-50 p-3 dark:border-ink-700 dark:bg-ink-700/40">
              <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-300">
                {t('quickAdd.summaryHeading')}
              </Text>
              <View className="gap-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-ink-700 dark:text-ink-200">
                    {t('quickAdd.summaryReceivable')}
                  </Text>
                  <Text
                    className="text-sm font-semibold text-ink-900 dark:text-ink-50"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {recChanged
                      ? `${formatMoney(cur.receivable, currency, locale)} → ${formatMoney(next.receivable, currency, locale)}`
                      : `${formatMoney(cur.receivable, currency, locale)} ${t('quickAdd.summaryUnchanged')}`}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-ink-700 dark:text-ink-200">
                    {t('quickAdd.summaryPayable')}
                  </Text>
                  <Text
                    className="text-sm font-semibold text-ink-900 dark:text-ink-50"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {payChanged
                      ? `${formatMoney(cur.payable, currency, locale)} → ${formatMoney(next.payable, currency, locale)}`
                      : `${formatMoney(cur.payable, currency, locale)} ${t('quickAdd.summaryUnchanged')}`}
                  </Text>
                </View>
                {overflow > 0.005 ? (
                  <Text className="mt-2 text-xs italic text-ink-500 dark:text-ink-300">
                    {t(
                      mode === 'income'
                        ? 'quickAdd.summaryOverflowToPayable'
                        : 'quickAdd.summaryOverflowToReceivable',
                      { amount: formatMoney(overflow, currency, locale) },
                    )}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })()}

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
