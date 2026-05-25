/**
 * Round 5 §2 — labelled section that hosts a list of HomeRow.
 *
 * The header shows `<count> · <total>` summarised for the section's
 * primary currency, with `+N more` when the rows span multiple
 * currencies. When the section has zero rows we render the localised
 * empty-state message inline (not a blank pane).
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { HomeRow, type HomeSectionTone } from '@/components/HomeRow';
import { Card } from '@/components/ui/Card';
import type { HomeListRow } from '@/hooks/useHomeList';
import { formatMoney } from '@/utils/currency';
import { displayContact } from '@/utils/contact';

interface HomeSectionProps {
  title: string;
  tone: HomeSectionTone;
  rows: HomeListRow[];
  emptyMessage: string;
  locale: string;
  /** Optional default currency used to pick the "primary" total to show. */
  defaultCurrency?: string;
  onRowPress: (row: HomeListRow) => void;
}

const TONE_HEADING: Record<HomeSectionTone, string> = {
  positive: 'text-income-700 dark:text-income-200',
  warning: 'text-payable-700 dark:text-payable-200',
};

export function HomeSection({
  title,
  tone,
  rows,
  emptyMessage,
  locale,
  defaultCurrency,
  onRowPress,
}: HomeSectionProps) {
  const { t } = useTranslation();

  // Build a per-currency total so the header can show "3 contacts · 35 250 TRY".
  // Pick the user's default currency if present in the rows, else the
  // currency with the largest total. `+N more` reflects how many other
  // currencies are folded behind that primary number.
  const summary = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of rows) {
      const value = tone === 'positive' ? Number(r.net_receivable) : Number(r.net_payable);
      totals.set(r.currency, (totals.get(r.currency) ?? 0) + value);
    }
    const entries = Array.from(totals.entries());
    if (entries.length === 0) {
      return { count: 0, primary: null as null | { currency: string; total: number }, more: 0 };
    }
    const primary =
      (defaultCurrency && totals.has(defaultCurrency)
        ? { currency: defaultCurrency, total: totals.get(defaultCurrency)! }
        : entries.sort((a, b) => b[1] - a[1])[0]
            ? { currency: entries[0]![0], total: entries[0]![1] }
            : null);
    return {
      count: rows.length,
      primary,
      more: Math.max(0, entries.length - 1),
    };
  }, [rows, tone, defaultCurrency]);

  const headerRight = summary.primary
    ? summary.more > 0
      ? t('home.section_summary_multi_currency', {
          count: summary.count,
          total: formatMoney(summary.primary.total, summary.primary.currency, locale),
          n: summary.more,
        })
      : t('home.section_summary', {
          count: summary.count,
          total: formatMoney(summary.primary.total, summary.primary.currency, locale),
        })
    : '';

  return (
    <View className="gap-2">
      <View className="flex-row items-end justify-between px-5">
        <Text
          className={`text-[11px] font-semibold uppercase tracking-widest ${TONE_HEADING[tone]}`}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {headerRight ? (
          <Text className="text-[11px] font-semibold text-ink-500 dark:text-ink-300">
            {headerRight}
          </Text>
        ) : null}
      </View>

      {rows.length === 0 ? (
        <View className="mx-5">
          <Card className="px-4 py-5">
            <Text className="text-center text-sm text-ink-500 dark:text-ink-300">
              {emptyMessage}
            </Text>
          </Card>
        </View>
      ) : (
        <View className="mx-5 overflow-hidden rounded-2xl border border-ink-100 bg-white dark:border-ink-700 dark:bg-ink-800">
          {rows.map((row, idx) => (
            <View key={`${row.contact_id}-${row.currency}`}>
              {idx > 0 ? <View className="h-px bg-ink-100 dark:bg-ink-700" /> : null}
              <HomeRow
                row={row}
                tone={tone}
                displayName={displayContact({
                  full_name: row.full_name,
                  phone_number: row.phone_number,
                })}
                locale={locale}
                onPress={onRowPress}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
