import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ContactForm } from '@/components/ContactForm';
import { DebtCard } from '@/components/DebtCard';
import { QuickAddFab } from '@/components/QuickAddFab';
import { QuickAddSheet, type QuickAddMode } from '@/components/QuickAddSheet';
import { TransactionListItem } from '@/components/TransactionListItem';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { avatarColor, colors } from '@/constants/theme';
import { useContact, useDeleteContact, useUpdateContact } from '@/hooks/useContacts';
import { useDebts } from '@/hooks/useDebts';
import { useTransactions } from '@/hooks/useTransactions';
import { confirm, notify } from '@/lib/confirm';
import { contactSchema } from '@/schemas/contact';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatMoney } from '@/utils/currency';
import { aggregateOutstandingByCurrency } from '@/utils/debtCalculation';

export default function ContactDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);

  const contactQ = useContact(id);
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const debtsQ = useDebts({ contactId: id });
  const txnQ = useTransactions({ contactId: id, limit: 50 });

  const [editing, setEditing] = useState(false);
  const [sheetMode, setSheetMode] = useState<QuickAddMode | null>(null);

  const activeDebts = useMemo(
    () => (debtsQ.data ?? []).filter((d) => d.status === 'active'),
    [debtsQ.data],
  );
  const balances = useMemo(
    () => aggregateOutstandingByCurrency(debtsQ.data ?? []),
    [debtsQ.data],
  );

  if (contactQ.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-ink-50 dark:bg-ink-900">
        <ActivityIndicator size="large" color={colors.brand[500]} />
      </SafeAreaView>
    );
  }

  if (contactQ.isError || !contactQ.data) {
    return (
      <SafeAreaView className="flex-1 bg-ink-50 dark:bg-ink-900">
        <EmptyState
          icon="❓"
          title={t('contacts.notFound')}
          action={{ label: t('common.retry'), onPress: () => void contactQ.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const contact = contactQ.data;
  const heroColor = avatarColor(contact.full_name);

  const onDelete = async () => {
    const ok = await confirm({
      title: t('contacts.delete'),
      message: t('contacts.deleteConfirm'),
      confirmLabel: t('contacts.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteContact.mutateAsync(contact.id);
      router.back();
    } catch (err) {
      notify(t('app.name'), (err as Error).message ?? t('errors.unknown'));
    }
  };

  const callPhone = () => {
    if (contact.phone_number) {
      void Linking.openURL(`tel:${contact.phone_number}`).catch(() => undefined);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-50 dark:bg-ink-900">
      {/* Hero header */}
      <View className="px-5 py-3" style={{ backgroundColor: heroColor }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            onPress={() => (editing ? setEditing(false) : router.back())}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          {!editing ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('contacts.edit')}
              onPress={() => setEditing(true)}
              className="rounded-full bg-white/15 px-4 py-2"
            >
              <Text className="text-sm font-semibold text-white">
                {t('contacts.edit')}
              </Text>
            </Pressable>
          ) : (
            <View className="w-16" />
          )}
        </View>

        <View className="items-center pb-6 pt-2">
          <View className="rounded-full bg-white/20 p-1">
            <Avatar name={contact.full_name} size={72} color="#FFFFFF22" />
          </View>
          <Text className="mt-3 text-2xl font-bold text-white">{contact.full_name}</Text>
          {contact.occupation ? (
            <Text className="mt-1 text-sm text-white/80">{contact.occupation}</Text>
          ) : null}
          {contact.phone_number ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('contacts.phoneNumber')}
              onPress={callPhone}
              className="mt-3 flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5"
            >
              <Ionicons name="call" size={14} color="#fff" />
              <Text
                className="text-sm font-medium text-white"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {contact.phone_number}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-5 py-5 gap-5 pb-32"
        keyboardShouldPersistTaps="handled"
      >
        {editing ? (
          <Card className="p-4">
            <ContactForm
              initialValues={{
                full_name: contact.full_name,
                phone_number: contact.phone_number ?? '',
                occupation: contact.occupation ?? '',
                notes: contact.notes ?? '',
              }}
              submitLabel={t('common.save')}
              submitting={updateContact.isPending}
              onCancel={() => setEditing(false)}
              onSubmit={async (rawValues) => {
                const parsed = contactSchema.safeParse(rawValues);
                if (!parsed.success) return;
                try {
                  await updateContact.mutateAsync({
                    id: contact.id,
                    patch: {
                      full_name: parsed.data.full_name,
                      phone_number: parsed.data.phone_number,
                      occupation: parsed.data.occupation,
                      notes: parsed.data.notes,
                    },
                  });
                  setEditing(false);
                } catch (err) {
                  notify(t('app.name'), (err as Error).message ?? t('errors.unknown'));
                }
              }}
            />
          </Card>
        ) : (
          <>
            {/* Balance summary per currency */}
            <View>
              <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">
                {t('contacts.balanceHeading')}
              </Text>
              {Object.keys(balances).length === 0 ? (
                <Card className="p-4">
                  <Text className="text-sm text-ink-500 dark:text-ink-400">
                    {t('contacts.noActiveDebts')}
                  </Text>
                </Card>
              ) : (
                <View className="gap-2">
                  {Object.entries(balances).map(([currency, totals]) => (
                    <Card key={currency} className="flex-row items-center justify-between p-4">
                      <Text className="text-xs font-bold text-ink-500 dark:text-ink-400">
                        {currency}
                      </Text>
                      <View className="flex-row gap-3">
                        {totals.receivable > 0 ? (
                          <View className="flex-row items-center gap-1">
                            <Ionicons name="arrow-up-circle" size={14} color={colors.income} />
                            <Text
                              className="text-sm font-bold text-income-600"
                              style={{ fontVariant: ['tabular-nums'] }}
                            >
                              {formatMoney(totals.receivable, currency)}
                            </Text>
                          </View>
                        ) : null}
                        {totals.payable > 0 ? (
                          <View className="flex-row items-center gap-1">
                            <Ionicons name="arrow-down-circle" size={14} color={colors.payable} />
                            <Text
                              className="text-sm font-bold text-payable-600"
                              style={{ fontVariant: ['tabular-nums'] }}
                            >
                              {formatMoney(totals.payable, currency)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </Card>
                  ))}
                </View>
              )}
            </View>

            {/* Notes if present */}
            {contact.notes ? (
              <Card className="p-4">
                <Text className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">
                  {t('contacts.notes')}
                </Text>
                <Text className="mt-2 text-base text-ink-700 dark:text-ink-200">
                  {contact.notes}
                </Text>
              </Card>
            ) : null}

            {/* Active debts */}
            {activeDebts.length > 0 ? (
              <View className="gap-2">
                <Text className="text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">
                  {t('debts.activeHeading')}
                </Text>
                {activeDebts.map((d) => (
                  <DebtCard
                    key={d.id}
                    debt={d}
                    contactName={contact.full_name}
                    onPress={(debt) =>
                      router.push({ pathname: '/debt/[id]', params: { id: debt.id } })
                    }
                  />
                ))}
              </View>
            ) : null}

            {/* Transaction history */}
            <View>
              <Text className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">
                {t('contacts.transactionHistory')}
              </Text>
              {txnQ.isLoading ? (
                <ActivityIndicator color={colors.brand[500]} />
              ) : (txnQ.data ?? []).length === 0 ? (
                <Card className="p-4">
                  <Text className="text-sm text-ink-500 dark:text-ink-400">
                    {t('contacts.noTransactions')}
                  </Text>
                </Card>
              ) : (
                <Card className="overflow-hidden p-0">
                  {(txnQ.data ?? []).map((tx, idx) => (
                    <View key={tx.id}>
                      {idx > 0 ? (
                        <View className="h-px bg-ink-100 dark:bg-ink-700" />
                      ) : null}
                      <TransactionListItem
                        transaction={tx}
                        contactName={contact.full_name}
                        onPress={(t2) =>
                          router.push({ pathname: '/transaction/[id]', params: { id: t2.id } })
                        }
                      />
                    </View>
                  ))}
                </Card>
              )}
            </View>

            <Button
              label={t('contacts.delete')}
              variant="danger"
              onPress={onDelete}
              loading={deleteContact.isPending}
              fullWidth
              leftIcon={<Ionicons name="trash-outline" size={18} color="#fff" />}
            />
          </>
        )}
      </ScrollView>

      <QuickAddFab onPick={(mode) => setSheetMode(mode)} />
      <QuickAddSheet
        visible={!!sheetMode}
        mode={sheetMode}
        onClose={() => setSheetMode(null)}
        defaultCurrency={defaultCurrency}
        initialContact={contact}
      />
    </SafeAreaView>
  );
}
