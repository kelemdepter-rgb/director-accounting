import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { ContactForm } from '@/components/ContactForm';
import { DebtCard } from '@/components/DebtCard';
import { QuickAddPicker } from '@/components/QuickAddPicker';
import { QuickAddSheet, type QuickAddMode } from '@/components/QuickAddSheet';
import { TransactionListItem } from '@/components/TransactionListItem';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<QuickAddMode | null>(null);

  const activeDebts = useMemo(
    () => (debtsQ.data ?? []).filter((d) => d.status === 'active'),
    [debtsQ.data],
  );
  const settledDebts = useMemo(
    () => (debtsQ.data ?? []).filter((d) => d.status === 'settled'),
    [debtsQ.data],
  );
  const balances = useMemo(
    () => aggregateOutstandingByCurrency(debtsQ.data ?? []),
    [debtsQ.data],
  );

  if (contactQ.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  if (contactQ.isError || !contactQ.data) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
        <EmptyState
          icon="❓"
          title={t('contacts.notFound')}
          action={{ label: t('common.retry'), onPress: () => void contactQ.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const contact = contactQ.data;

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

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-row items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
        <Button
          label={t('common.cancel')}
          variant="ghost"
          size="sm"
          onPress={() => (editing ? setEditing(false) : router.back())}
        />
        <Text
          accessibilityRole="header"
          className="flex-1 px-2 text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50"
          numberOfLines={1}
        >
          {contact.full_name}
        </Text>
        {editing ? (
          <View className="w-16" />
        ) : (
          <Button
            label={t('contacts.edit')}
            variant="ghost"
            size="sm"
            onPress={() => setEditing(true)}
          />
        )}
      </View>

      <ScrollView contentContainerClassName="px-5 py-6 gap-6" keyboardShouldPersistTaps="handled">
        {editing ? (
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
        ) : (
          <>
            <View className="gap-3">
              {contact.phone_number ? (
                <Field label={t('contacts.phoneNumber')} value={contact.phone_number} />
              ) : null}
              {contact.occupation ? (
                <Field label={t('contacts.occupation')} value={contact.occupation} />
              ) : null}
              {contact.notes ? (
                <Field label={t('contacts.notes')} value={contact.notes} />
              ) : null}
              {!contact.phone_number && !contact.occupation && !contact.notes ? (
                <Text className="text-base text-neutral-500 dark:text-neutral-400">
                  {t('contacts.noExtraInfo')}
                </Text>
              ) : null}
            </View>

            <View className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-900">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('contacts.balanceHeading')}
              </Text>
              {Object.keys(balances).length === 0 ? (
                <Text className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  {t('contacts.noActiveDebts')}
                </Text>
              ) : (
                <View className="mt-2 gap-1">
                  {Object.entries(balances).map(([currency, totals]) => (
                    <View key={currency} className="flex-row items-center justify-between">
                      <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                        {currency}
                      </Text>
                      <View className="flex-row gap-3">
                        {totals.receivable > 0 ? (
                          <Text className="text-sm font-semibold text-receivable">
                            ↗ {formatMoney(totals.receivable, currency)}
                          </Text>
                        ) : null}
                        {totals.payable > 0 ? (
                          <Text className="text-sm font-semibold text-payable">
                            ↙ {formatMoney(totals.payable, currency)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <Button
              label={t('quickAdd.openPicker')}
              onPress={() => setPickerOpen(true)}
              fullWidth
            />

            {activeDebts.length > 0 ? (
              <View className="gap-3">
                <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
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

            {settledDebts.length > 0 ? (
              <View className="gap-3">
                <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('debts.settledHeading')}
                </Text>
                {settledDebts.map((d) => (
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

            <View className="gap-3">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('contacts.transactionHistory')}
              </Text>
              {txnQ.isLoading ? (
                <ActivityIndicator color="#4f46e5" />
              ) : (txnQ.data ?? []).length === 0 ? (
                <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t('contacts.noTransactions')}
                </Text>
              ) : (
                <View className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                  {(txnQ.data ?? []).map((tx) => (
                    <TransactionListItem
                      key={tx.id}
                      transaction={tx}
                      contactName={contact.full_name}
                    />
                  ))}
                </View>
              )}
            </View>

            <Button
              label={t('contacts.delete')}
              variant="danger"
              onPress={onDelete}
              loading={deleteContact.isPending}
              fullWidth
            />
          </>
        )}
      </ScrollView>

      <QuickAddPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(mode) => {
          setPickerOpen(false);
          setSheetMode(mode);
        }}
      />
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </Text>
      <Text className="mt-1 text-base text-neutral-900 dark:text-neutral-100">{value}</Text>
    </View>
  );
}

