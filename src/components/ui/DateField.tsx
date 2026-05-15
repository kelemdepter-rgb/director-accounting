import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/theme';
import { formatDate } from '@/utils/date';

interface DateFieldProps {
  label: string;
  value: Date;
  onChange: (next: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
}

function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateField({
  label,
  value,
  onChange,
  maximumDate = new Date(),
  minimumDate,
}: DateFieldProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const display = formatDate(value, 'long', i18n.language);
  const a11yLabel = `${label}, ${display}`;

  const handleNative = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'set' && date) onChange(date);
  };

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        maximumDate,
        minimumDate,
        onChange: handleNative,
      });
      return;
    }
    if (Platform.OS === 'ios') {
      setOpen(true);
    }
  };

  return (
    <View className="w-full">
      <Text className="mb-1.5 text-sm font-medium text-ink-700 dark:text-ink-300">
        {label}
      </Text>

      {Platform.OS === 'web' ? (
        <WebDateInput
          ariaLabel={a11yLabel}
          value={value}
          onChange={onChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          onPress={openPicker}
          className="h-12 flex-row items-center justify-between rounded-xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-700"
        >
          <Text className="text-base text-ink-900 dark:text-ink-50">{display}</Text>
          <Ionicons name="calendar-outline" size={20} color={colors.ink[500]} />
        </Pressable>
      )}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            onPress={() => setOpen(false)}
            className="flex-1 justify-end bg-black/40"
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              className="gap-3 rounded-t-3xl bg-white p-4 pb-8 dark:bg-ink-800"
            >
              <DateTimePicker
                value={value}
                mode="date"
                display="inline"
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                onChange={(event, date) => {
                  if (event.type === 'set' && date) onChange(date);
                }}
              />
              <Button
                label={t('common.save')}
                onPress={() => setOpen(false)}
                fullWidth
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

interface WebDateInputProps {
  ariaLabel: string;
  value: Date;
  onChange: (next: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
}

// Web-only: use the native HTML date input so the user gets the OS-level
// calendar widget. Renders via React.createElement to keep the RN typecheck
// happy on native targets that never load this branch.
function WebDateInput({
  ariaLabel,
  value,
  onChange,
  maximumDate,
  minimumDate,
}: WebDateInputProps) {
  const handleChange = (event: { target: { value: string } }) => {
    const next = event.target.value;
    if (!next) return;
    const [y, m, d] = next.split('-').map(Number);
    if (!y || !m || !d) return;
    onChange(new Date(y, m - 1, d));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createElement('input' as any, {
    type: 'date',
    'aria-label': ariaLabel,
    value: toIsoDate(value),
    max: maximumDate ? toIsoDate(maximumDate) : undefined,
    min: minimumDate ? toIsoDate(minimumDate) : undefined,
    onChange: handleChange,
    style: {
      height: 48,
      width: '100%',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.ink[200],
      backgroundColor: '#fff',
      paddingLeft: 12,
      paddingRight: 12,
      fontSize: 16,
      color: colors.ink[900],
      fontFamily: 'inherit',
    },
  });
}
