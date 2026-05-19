/**
 * Pure helpers for building the JSON bodies passed to Supabase RPC calls
 * related to debts. Lives in its own module so unit tests can import it
 * without dragging the supabase-js client (which transitively pulls in
 * expo-modules-core and requires the RN runtime globals) into the test env.
 *
 * If you change anything here, also update migration
 * `supabase/migrations/011_fix_create_debt_with_cashflow.sql` and the
 * contract test in `__tests__/debtRpcContract.test.ts`.
 */

import type { DebtType } from '@/types/database';

export interface CreateDebtRpcInput {
  contact_id: string;
  type: DebtType;
  principal_amount: number;
  currency: string;
  description: string | null;
  occurred_at?: string;
}

export interface CreateDebtRpcParams {
  p_contact_id: string;
  p_type: DebtType;
  p_principal_amount: number;
  p_currency: string;
  p_description: string | null;
  p_occurred_at?: string;
}

/**
 * Build the params object for create_debt_with_cashflow.
 *
 * PostgREST resolves function overloads by *exact* set of argument names, so
 * we must NEVER emit a key with an undefined value: supabase-js converts the
 * object to a request body and the DB then looks for an overload with that
 * argument present. When `occurred_at` is not supplied, the function's
 * default (`now()`) kicks in server-side.
 */
export function buildCreateDebtRpcParams(input: CreateDebtRpcInput): CreateDebtRpcParams {
  const params: CreateDebtRpcParams = {
    p_contact_id: input.contact_id,
    p_type: input.type,
    p_principal_amount: input.principal_amount,
    p_currency: input.currency,
    p_description: input.description,
  };
  if (input.occurred_at !== undefined) {
    params.p_occurred_at = input.occurred_at;
  }
  return params;
}
