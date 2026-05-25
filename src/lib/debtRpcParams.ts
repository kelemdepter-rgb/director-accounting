/**
 * Pure helpers for building the JSON bodies passed to Supabase RPC calls
 * related to debts. Lives in its own module so unit tests can import it
 * without dragging the supabase-js client (which transitively pulls in
 * expo-modules-core and requires the RN runtime globals) into the test env.
 *
 * If you change anything here, also update migration
 * `supabase/migrations/019_create_debt_with_service_type.sql` and the
 * contract test in `__tests__/debtRpcContract.test.ts`.
 */

import type { ContactServiceType, DebtType } from '@/types/database';

export interface CreateDebtRpcInput {
  contact_id: string;
  type: DebtType;
  principal_amount: number;
  currency: string;
  description: string | null;
  occurred_at?: string;
  service_type?: ContactServiceType | null;
  service_type_other?: string | null;
}

export interface CreateDebtRpcParams {
  p_contact_id: string;
  p_type: DebtType;
  p_principal_amount: number;
  p_currency: string;
  p_description: string | null;
  p_occurred_at?: string;
  p_service_type: ContactServiceType | null;
  p_service_type_other: string | null;
}

/**
 * Build the params object for create_debt_with_cashflow.
 *
 * PostgREST resolves function overloads by *exact* set of argument names, so
 * we must NEVER emit a key with an undefined value: supabase-js converts the
 * object to a request body and the DB then looks for an overload with that
 * argument present. When `occurred_at` is not supplied, the function's
 * default (`now()`) kicks in server-side.
 *
 * Round 5 §1: `p_service_type` and `p_service_type_other` are part of the
 * new signature in migration 019 and must ALWAYS be present (with nulls
 * when the user didn't pick a value). If we omitted them, PostgREST would
 * still find the function (defaults supplied) but the new key-set tested
 * by `debtRpcContract.test.ts` would not match.
 */
export function buildCreateDebtRpcParams(input: CreateDebtRpcInput): CreateDebtRpcParams {
  const params: CreateDebtRpcParams = {
    p_contact_id: input.contact_id,
    p_type: input.type,
    p_principal_amount: input.principal_amount,
    p_currency: input.currency,
    p_description: input.description,
    p_service_type: input.service_type ?? null,
    p_service_type_other: input.service_type_other ?? null,
  };
  if (input.occurred_at !== undefined) {
    params.p_occurred_at = input.occurred_at;
  }
  return params;
}
