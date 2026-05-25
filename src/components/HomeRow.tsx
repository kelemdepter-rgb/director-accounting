/**
 * Round 5 §2 — single row inside a HomeSection. One contact + currency.
 *
 * Layout (mirrors the prompt's sketch):
 *
 *   ●  Ahmet Yıldız              [VIZE]   12.05.2026
 *      20 000 TRY
 *
 * The avatar is tinted by section tone (green for receivable, amber for
 * payable). Service badge is hidden when the row has no service_type, so
 * legacy rows that pre-dated migration 018 render cleanly without a stub.
 */
import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ServiceBadge } from '@/components/ServiceBadge';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/theme';
import type { HomeListRow } from '@/hooks/useHomeList';
import { formatMoney } from '@/utils/currency';
import { formatDate } from '@/utils/date';

export type HomeSectionTone = 'positive' | 'warning';

interface HomeRowProps {
  row: HomeListRow;
  tone: HomeSectionTone;
  /** Resolved display name (falls back to phone). */
  displayName: string;
  locale: string;
  onPress: (row: HomeListRow) => void;
}

const TONE_AMOUNT: Record<HomeSectionTone, string> = {
  positive: 'text-income-600 dark:text-income-300',
  warning: 'text-payable-600 dark:text-payable-300',
};

const TONE_AVATAR: Record<HomeSectionTone, string | undefined> = {
  // Use the same hash-of-name color the rest of the app uses; tone is
  // already conveyed by the amount color and section heading. Passing
  // a tone-tinted color here would lose the per-contact stable hue
  // and make every row look the same.
  positive: undefined,
  warning: undefined,
};

function HomeRowImpl({ row, tone, displayName, locale, onPress }: HomeRowProps) {
  const amount =
    tone === 'positive' ? Number(row.net_receivable) : Number(row.net_payable);
  const date = row.last_at ? formatDate(row.last_at, 'short', locale) : '';
  const moreCount = row.service_type_count > 1 ? row.service_type_count - 1 : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${displayName}, ${formatMoney(amount, row.currency, locale)}`}
      onPress={() => onPress(row)}
      // data-test attribute helps Playwright reach a specific row.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...({ 'data-test': 'home-row' } as any)}
      className="flex-row items-center gap-3 px-5 py-3 active:bg-ink-50 dark:active:bg-ink-700"
    >
      <Avatar name={displayName} size={44} color={TONE_AVATAR[tone]} />
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className="flex-shrink text-base font-semibold text-ink-900 dark:text-ink-50"
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <ServiceBadge
            type={row.last_service_type}
            other={row.last_service_type_other}
          />
          {moreCount > 0 ? (
            <Text className="text-[10px] font-semibold text-ink-500 dark:text-ink-300">
              {`+${moreCount}`}
            </Text>
          ) : null}
        </View>
        <View className="mt-1 flex-row items-baseline gap-2">
          <Text
            className={`text-base font-bold ${TONE_AMOUNT[tone]}`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatMoney(amount, row.currency, locale)}
          </Text>
          {date ? (
            <Text className="text-xs text-ink-500 dark:text-ink-300">{date}</Text>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.ink[400]} />
    </Pressable>
  );
}

export const HomeRow = memo(HomeRowImpl);
