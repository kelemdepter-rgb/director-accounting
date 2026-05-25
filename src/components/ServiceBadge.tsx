/**
 * Round 5 §1 — small pill rendered next to a transaction or debt row to
 * show which service it was tagged for (Vize / Bilet / Bilet ve Vize /
 * the user's free-text "Başka" label).
 *
 * Renders nothing when `type` is null, so callers can drop it in without
 * guarding on the data.
 */
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { ContactServiceType } from '@/types/database';

interface ServiceBadgeProps {
  type: ContactServiceType | null;
  /** Free-text label, used only when `type === 'other'`. */
  other?: string | null;
  /** Visual size variant. Default `sm` matches the inline row badge. */
  size?: 'sm' | 'md';
}

const MAX_OTHER_CHARS = 24;

const KEY_FOR: Record<Exclude<ContactServiceType, 'other'>, string> = {
  vize: 'contacts.serviceTypeVize',
  bilet: 'contacts.serviceTypeBilet',
  bilet_ve_vize: 'contacts.serviceTypeBiletVeVize',
};

export function ServiceBadge({ type, other, size = 'sm' }: ServiceBadgeProps) {
  const { t } = useTranslation();
  if (!type) return null;

  let label: string;
  if (type === 'other') {
    const raw = (other ?? '').trim();
    if (!raw) {
      // The "other" pill without text should never reach the DB (CHECK
      // constraint blocks it), but render the fallback label so a
      // legacy row from before the constraint won't crash the list.
      label = t('contacts.serviceTypeOther');
    } else {
      label =
        raw.length > MAX_OTHER_CHARS
          ? `${raw.slice(0, MAX_OTHER_CHARS - 1)}…`
          : raw;
    }
  } else {
    label = t(KEY_FOR[type]);
  }

  const textSize = size === 'md' ? 'text-xs' : 'text-[10px]';
  const padding = size === 'md' ? 'px-2.5 py-1' : 'px-2 py-0.5';

  return (
    <View
      className={`rounded-full bg-brand-50 dark:bg-brand-900/40 ${padding}`}
    >
      <Text
        className={`${textSize} font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-200`}
      >
        {label}
      </Text>
    </View>
  );
}
