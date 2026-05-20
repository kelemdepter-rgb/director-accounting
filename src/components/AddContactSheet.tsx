/**
 * Sheet for the autocomplete "+ Ekle" fallback.
 *
 * Round 2 wired the fallback as an inline row that immediately fired a
 * raw `.insert()` with a bare `catch {}` around it. If the insert failed
 * (RLS, partial-unique conflict on user_id + phone, etc.) the user saw
 * nothing and reported "the new contact doesn't appear in my list" —
 * which is what Round 3 §3 set out to fix.
 *
 * This sheet:
 *   - Accepts a prefill (whatever the user typed in the autocomplete);
 *     uses a digits-only heuristic to decide whether to seed the phone
 *     or name field.
 *   - Calls `create_contact_minimal` (migration 015) which handles the
 *     duplicate-phone case by returning the existing row.
 *   - Surfaces errors via `notify` instead of swallowing them.
 *   - On success, hands the saved row back to the parent so the
 *     in-progress entry form can select it without a refetch race.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useCreateMinimalContact } from '@/hooks/useContacts';
import { notify } from '@/lib/confirm';
import { useAuthStore } from '@/stores/authStore';
import type { ContactRow } from '@/types/database';

import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface AddContactSheetProps {
  visible: boolean;
  /** Whatever the user typed into the autocomplete (name or phone). */
  prefill?: string;
  onClose: () => void;
  /** Called with the saved row when the insert succeeds. */
  onCreated: (contact: ContactRow) => void;
}

const PHONE_HEURISTIC = /^[+0-9\s()\-]{3,}$/;

export function AddContactSheet({
  visible,
  prefill = '',
  onClose,
  onCreated,
}: AddContactSheetProps) {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);
  const createMinimal = useCreateMinimalContact();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset + prefill every time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    if (PHONE_HEURISTIC.test(prefill.trim())) {
      setPhone(prefill.trim());
      setName('');
    } else {
      setPhone('');
      setName(prefill.trim());
    }
    setError(null);
  }, [visible, prefill]);

  const handleSave = async () => {
    setError(null);
    const trimmedPhone = phone.trim();
    const trimmedName = name.trim();
    if (!trimmedPhone && !trimmedName) {
      setError(t('contacts.addInlineNeedsValue'));
      return;
    }
    if (!userId) {
      setError(t('errors.unknown'));
      return;
    }
    try {
      const row = await createMinimal.mutateAsync({
        phone: trimmedPhone || null,
        name: trimmedName || null,
        userId,
      });
      onCreated(row);
      onClose();
    } catch (err) {
      // Surface the error rather than swallowing it (the Round 2
      // regression). The notify lives outside the sheet so users still
      // see something even if we close.
      const message = (err as Error).message ?? t('errors.unknown');
      setError(message);
      notify(t('app.name'), message);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('contacts.addNew')}
      closeLabel={t('common.cancel')}
      scrollable
    >
      <View className="gap-4">
        <Input
          label={`${t('contacts.phoneNumber')} *`}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
        <Input
          label={t('contacts.fullName')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        {error ? (
          <Text className="text-sm text-expense-600">{error}</Text>
        ) : null}
        <Button
          label={t('common.save')}
          onPress={handleSave}
          loading={createMinimal.isPending}
          fullWidth
          size="lg"
        />
      </View>
    </BottomSheet>
  );
}
