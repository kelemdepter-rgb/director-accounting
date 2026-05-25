/**
 * Reusable single-select pill group for the service-type field.
 *
 * Round 5 §1 moves this control off the contact form and onto the
 * transaction entry form. Lives in its own component so the same UI can be
 * reused on any future surface that needs to read or set a transaction's
 * service tag (e.g. the receivable / payable list rows on the home page).
 *
 * The four values match the `contact_service_type` Postgres enum from
 * migration 013 (extended by 016 to add `other`). When the pill `other`
 * is active, the caller is responsible for rendering the free-text
 * description input — keeping that decision outside the pill group lets
 * the caller place the input where it makes sense in their layout.
 */
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { ContactServiceType } from '@/types/database';

interface ServiceTypePillsProps {
  value: ContactServiceType | null;
  onChange: (next: ContactServiceType | null) => void;
  /**
   * Render a heading above the pills. Defaults to `true`; pass `false`
   * if the caller is providing its own label.
   */
  withLabel?: boolean;
  /** Optional override for the heading label. */
  label?: string;
}

const OPTIONS: { value: ContactServiceType; labelKey: string }[] = [
  { value: 'vize', labelKey: 'contacts.serviceTypeVize' },
  { value: 'bilet', labelKey: 'contacts.serviceTypeBilet' },
  { value: 'bilet_ve_vize', labelKey: 'contacts.serviceTypeBiletVeVize' },
  { value: 'other', labelKey: 'contacts.serviceTypeOther' },
];

export function ServiceTypePills({
  value,
  onChange,
  withLabel = true,
  label,
}: ServiceTypePillsProps) {
  const { t } = useTranslation();
  return (
    <View>
      {withLabel ? (
        <Text className="mb-1.5 text-sm font-medium text-ink-700 dark:text-ink-300">
          {label ?? t('quickAdd.serviceTypeLabel')}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(active ? null : opt.value)}
              className={`rounded-full px-4 py-2 ${
                active ? 'bg-brand-500' : 'bg-ink-100 dark:bg-ink-700'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  active ? 'text-white' : 'text-ink-700 dark:text-ink-200'
                }`}
              >
                {t(opt.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
