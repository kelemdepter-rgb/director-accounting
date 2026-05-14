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
  user_id: string;
  amount: number;
  note: string | null;
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePaymentArgs) => {
      const { data, error } = await supabase
        .from('debt_payments')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as DebtPaymentRow;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: DEBTS_KEY });
      void qc.invalidateQueries({ queryKey: [...DEBTS_KEY, 'payments', row.debt_id] });
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
