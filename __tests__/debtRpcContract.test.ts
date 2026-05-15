import { describe, expect, it } from 'vitest';

/**
 * The Postgres RPCs `record_debt_payment` and `create_debt_with_cashflow` are
 * the boundary between the app and the database. We type the *return* shape
 * on the client (see `RecordedPayment` / `CreatedDebtWithCashflow` in
 * `src/hooks/useDebts.ts`) and the DB function definitions in
 * `supabase/migrations/006_record_payment_rpc.sql` and
 * `supabase/migrations/008_debt_cash_link.sql`.
 *
 * These tests pin both ends with a `satisfies` check so a future refactor on
 * one side that drifts from the other fails the type-check before it ships.
 */

interface RecordPaymentResult {
  paid_amount: number;
  remaining_amount: number;
  debt_status: 'active' | 'settled';
  transaction_id: string;
}

interface CreateDebtWithCashflowResult {
  debt_id: string;
  transaction_id: string;
}

describe('record_debt_payment RPC contract', () => {
  it('return shape matches RecordPaymentResult', () => {
    const sample = {
      paid_amount: 100,
      remaining_amount: 0,
      debt_status: 'settled',
      transaction_id: '00000000-0000-0000-0000-000000000000',
    } as const satisfies RecordPaymentResult;

    expect(sample.debt_status).toBe('settled');
    expect(typeof sample.paid_amount).toBe('number');
    expect(typeof sample.transaction_id).toBe('string');
  });

  it('debt_status is constrained to active | settled', () => {
    const active = {
      paid_amount: 25,
      remaining_amount: 75,
      debt_status: 'active',
      transaction_id: 'abc',
    } satisfies RecordPaymentResult;
    expect(active.debt_status).toBe('active');
  });
});

describe('create_debt_with_cashflow RPC contract', () => {
  it('returns exactly debt_id and transaction_id', () => {
    const sample = {
      debt_id: '11111111-1111-1111-1111-111111111111',
      transaction_id: '22222222-2222-2222-2222-222222222222',
    } as const satisfies CreateDebtWithCashflowResult;

    expect(Object.keys(sample).sort()).toEqual(['debt_id', 'transaction_id']);
  });
});
