/**
 * QuickAddSheet rendered through react-native-web. Vitest aliases
 * `react-native` → `react-native-web` (see vitest.config.ts), so React Native
 * components compile to ordinary DOM nodes and `@testing-library/react` can
 * drive them in jsdom. `@testing-library/react-native` itself depends on the
 * real (Flow-typed) React Native entry point and can't load under Vitest, so
 * we use the DOM variant instead — the test semantics are identical.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createDebtMutation = vi.fn();
const createTransactionMutation = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// nativewind transitively pulls in the real (Flow-typed) RN entry; stub it.
vi.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light', setColorScheme: () => {} }),
  styled: <T,>(component: T) => component,
}));

vi.mock('@/hooks/useDebts', () => ({
  useCreateDebt: () => ({ mutateAsync: createDebtMutation, isPending: false }),
}));

vi.mock('@/hooks/useTransactions', () => ({
  useCreateTransaction: () => ({
    mutateAsync: createTransactionMutation,
    isPending: false,
  }),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'user-test' } }),
}));

// The date picker pulls in native modules; we don't exercise it here.
vi.mock('@/components/ui/DateField', () => ({
  DateField: () => null,
}));

// ContactAutocomplete pulls expo-contacts + Supabase. Stub it with a tiny
// "pick a contact" button so the test can simulate a user choosing one.
vi.mock('@/components/ContactAutocomplete', () => ({
  ContactAutocomplete: ({
    onChange,
  }: {
    value: unknown;
    onChange: (c: { id: string; full_name: string }) => void;
  }) => (
    <button
      type="button"
      aria-label="pick-contact"
      onClick={() => onChange({ id: 'contact-1', full_name: 'Bob' })}
    >
      pick-contact
    </button>
  ),
}));

// Module-under-test is imported AFTER the vi.mock declarations above so the
// mocks register before the component pulls its dependencies.
// eslint-disable-next-line import/first
import { QuickAddSheet } from '@/components/QuickAddSheet';

describe('QuickAddSheet — lend mode', () => {
  beforeEach(() => {
    createDebtMutation.mockReset();
    createTransactionMutation.mockReset();
    createDebtMutation.mockResolvedValue({
      debt_id: 'd1',
      transaction_id: 't1',
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the required fields (contact, amount, currency)', () => {
    render(
      <QuickAddSheet
        visible
        mode="lend"
        onClose={() => {}}
        defaultCurrency="USD"
      />,
    );

    expect(screen.getByLabelText('quickAdd.amount')).toBeTruthy();
    expect(screen.getByLabelText('pick-contact')).toBeTruthy();
    expect(screen.getByText('USD')).toBeTruthy();
  });

  it('shows an error when the user submits without a contact', async () => {
    render(
      <QuickAddSheet
        visible
        mode="lend"
        onClose={() => {}}
        defaultCurrency="USD"
      />,
    );

    const amountInput = screen.getByLabelText('quickAdd.amount');
    fireEvent.change(amountInput, { target: { value: '500' } });

    const save = screen.getByText('common.save');
    fireEvent.click(save);

    await waitFor(() => {
      expect(screen.getByText('validation.contactRequired')).toBeTruthy();
    });
    expect(createDebtMutation).not.toHaveBeenCalled();
  });

  it('calls useCreateDebt with the right payload on valid submission', async () => {
    const onClose = vi.fn();
    render(
      <QuickAddSheet
        visible
        mode="lend"
        onClose={onClose}
        defaultCurrency="USD"
      />,
    );

    const amountInput = screen.getByLabelText('quickAdd.amount');
    fireEvent.change(amountInput, { target: { value: '500' } });
    fireEvent.click(screen.getByLabelText('pick-contact'));
    fireEvent.click(screen.getByText('common.save'));

    await waitFor(() => {
      expect(createDebtMutation).toHaveBeenCalledTimes(1);
    });

    const arg = createDebtMutation.mock.calls[0]?.[0];
    expect(arg).toMatchObject({
      contact_id: 'contact-1',
      type: 'receivable',
      principal_amount: 500,
      currency: 'USD',
      description: null,
    });
    expect(typeof arg.occurred_at).toBe('string');
    expect(arg.occurred_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
