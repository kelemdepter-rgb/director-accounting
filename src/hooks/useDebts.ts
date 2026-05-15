import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type {
  DebtPaymentRow,
  DebtRow,
  DebtStatus,
  DebtType,
  DebtWithBalanceRow,
} from '@/types/database';

export const DEBTS_KEY = ['debts'] as const;

export interface UseDebtsOptions {
  status?: DebtStatus;
  contactId?: string;
  type?: DebtType;
  limit?: number;
  enabled?: boolean;
}

export function useDebts({
  status,
  contactId,
  type,
  limit = 100,
  enabled = true,
}: UseDebtsOptions = {}) {
  return useQuery({
    queryKey: [...DEBTS_KEY, { status, contactId, type, limit }] as const,
    enabled,
    queryFn: async () => {
      let q = supabase
        .from('debts_with_balance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (status) q = q.eq('status', status);
      if (contactId) q = q.eq('contact_id', contactId);
      if (type) q = q.eq('type', type);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DebtWithBalanceRow[];
    },
  });
}

export function useDebt(id: string | undefined) {
  return useQuery({
    queryKey: [...DEBTS_KEY, 'detail', id] as const,
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw new Error('Missing id');
      const { data, error } = await supabase
        .from('debts_with_balance')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as DebtWithBalanceRow;
    },
  });
}

export function useDebtPayments(debtId: string | undefined) {
  return useQuery({
    queryKey: [...DEBTS_KEY, 'payments', debtId] as const,
    enabled: !!debtId,
    queryFn: async () => {
      if (!debtId) throw new Error('Missing debtId');
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', debtId)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DebtPaymentRow[];
    },
  });
}

export interface CreateDebtArgs {
  user_id: string;
  contact_id: string;
  type: DebtType;
  principal_amount: number;
  currency: string;
  description: string | null;
}

export function useCreateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDebtArgs) => {
      const { data, error } = await supabase.from('debts').insert(input).select().single();
      if (error) throw error;
      return data as DebtRow;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DEBTS_KEY });
      void qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export interface CreatePaymentArgs {
  debt_id: string;
  amount: number;
  note: string | null;
  paid_at?: string;
}

export interface RecordedPayment {
  debt_id: string;
  paid_amount: number;
  remaining_amount: number;
  debt_status: DebtStatus;
  transaction_id: string;
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePaymentArgs): Promise<RecordedPayment> => {
      const { data, error } = await supabase
        .rpc('record_debt_payment', {
          p_debt_id: input.debt_id,
          p_amount: input.amount,
          p_note: input.note,
          p_paid_at: input.paid_at,
        })
        .single();
      if (error) throw error;
      const row = data as {
        paid_amount: number | string;
        remaining_amount: number | string;
        debt_status: DebtStatus;
        transaction_id: string;
      };
      return {
        debt_id: input.debt_id,
        paid_amount: Number(row.paid_amount),
        remaining_amount: Number(row.remaining_amount),
        debt_status: row.debt_status,
        transaction_id: row.transaction_id,
      };
    },
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: DEBTS_KEY });
      void qc.invalidateQueries({ queryKey: [...DEBTS_KEY, 'detail', result.debt_id] });
      void qc.invalidateQueries({ queryKey: [...DEBTS_KEY, 'payments', result.debt_id] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
      void qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('debts').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DEBTS_KEY });
      void qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}
