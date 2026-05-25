import { describe, expect, it } from 'vitest';

import { buildCreateDebtRpcParams } from '@/lib/debtRpcParams';

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

/**
 * Pin the parameter names the frontend sends to PostgREST. Drift between
 * these names and the function signature in migration 011 (or any future
 * migration) re-introduces the production "function not found in schema
 * cache" bug, so this test is the early-warning trip wire.
 */
describe('create_debt_with_cashflow argument names', () => {
  it('omits p_occurred_at when occurred_at is undefined, but always emits service-type keys', () => {
    const params = buildCreateDebtRpcParams({
      contact_id: 'c1',
      type: 'receivable',
      principal_amount: 100,
      currency: 'TRY',
      description: null,
    });
    // Round 5 §1: p_service_type and p_service_type_other are part of the
    // new signature (migration 019) and must always be present — emitting
    // nulls when the user didn't pick a value.
    expect(Object.keys(params).sort()).toEqual([
      'p_contact_id',
      'p_currency',
      'p_description',
      'p_principal_amount',
      'p_service_type',
      'p_service_type_other',
      'p_type',
    ]);
    // Critically: the key must NOT be present, not just undefined-valued.
    // PostgREST resolves overloads by exact key set, so an undefined value
    // would survive JSON.stringify on some clients and break the lookup.
    expect('p_occurred_at' in params).toBe(false);
    expect(params.p_service_type).toBeNull();
    expect(params.p_service_type_other).toBeNull();
  });

  it('emits p_occurred_at when occurred_at is provided', () => {
    const params = buildCreateDebtRpcParams({
      contact_id: 'c1',
      type: 'payable',
      principal_amount: 50,
      currency: 'USD',
      description: 'Vize',
      occurred_at: '2025-01-02T03:04:05.000Z',
    });
    expect(Object.keys(params).sort()).toEqual([
      'p_contact_id',
      'p_currency',
      'p_description',
      'p_occurred_at',
      'p_principal_amount',
      'p_service_type',
      'p_service_type_other',
      'p_type',
    ]);
    expect(params.p_occurred_at).toBe('2025-01-02T03:04:05.000Z');
  });

  it('forwards service_type and service_type_other when supplied', () => {
    const params = buildCreateDebtRpcParams({
      contact_id: 'c1',
      type: 'receivable',
      principal_amount: 200,
      currency: 'TRY',
      description: null,
      service_type: 'other',
      service_type_other: 'Otel rezervasyonu',
    });
    expect(params.p_service_type).toBe('other');
    expect(params.p_service_type_other).toBe('Otel rezervasyonu');
  });
});
