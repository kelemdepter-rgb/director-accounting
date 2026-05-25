import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { HOME_LIST_KEY } from '@/hooks/useHomeList';
import { supabase } from '@/lib/supabase';
import type {
  ContactServiceType,
  TransactionRow,
  TransactionType,
} from '@/types/database';

export const TRANSACTIONS_KEY = ['transactions'] as const;

export interface UseTransactionsOptions {
  type?: TransactionType;
  contactId?: string | null;
  /** ISO datetime — inclusive lower bound on occurred_at. */
  occurredFrom?: string;
  /** ISO datetime — exclusive upper bound on occurred_at. */
  occurredUntil?: string;
  limit?: number;
  enabled?: boolean;
}

export function useTransactions({
  type,
  contactId,
  occurredFrom,
  occurredUntil,
  limit = 50,
  enabled = true,
}: UseTransactionsOptions = {}) {
  return useQuery({
    queryKey: [
      ...TRANSACTIONS_KEY,
      { type, contactId, occurredFrom, occurredUntil, limit },
    ] as const,
    enabled,
    queryFn: async () => {
      let q = supabase
        .from('transactions')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(limit);

      if (type) q = q.eq('type', type);
      if (contactId !== undefined && contactId !== null) q = q.eq('contact_id', contactId);
      if (occurredFrom) q = q.gte('occurred_at', occurredFrom);
      if (occurredUntil) q = q.lt('occurred_at', occurredUntil);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TransactionRow[];
    },
  });
}

export interface CreateTransactionArgs {
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string | null;
  contact_id: string | null;
  occurred_at?: string;
  service_type?: ContactServiceType | null;
  service_type_other?: string | null;
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTransactionArgs) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as TransactionRow;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      void qc.invalidateQueries({ queryKey: ['summary'] });
      void qc.invalidateQueries({ queryKey: HOME_LIST_KEY });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      void qc.invalidateQueries({ queryKey: ['summary'] });
      void qc.invalidateQueries({ queryKey: HOME_LIST_KEY });
    },
  });
}
