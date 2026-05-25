/**
 * Round 5 §2 — data hook backing the new home page list.
 *
 * Reads from `v_home_list` (migration 020), which already joins
 * v_contact_balance with each contact's row in `contacts` and the most
 * recent transaction date + service type. One row per (contact, currency)
 * with an open balance.
 *
 * Cache key `['home-list']` is invalidated by every mutation that can
 * change a balance: createDebt, createTransaction, deleteTransaction,
 * deleteDebt, recordPayment, updatePayment, deletePayment, and contact
 * delete (since rows for deleted contacts vanish). The invalidations live
 * next to each mutation, not here — search the codebase for
 * `HOME_LIST_KEY` to find every call site.
 */
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { ContactServiceType } from '@/types/database';

export const HOME_LIST_KEY = ['home-list'] as const;

export interface HomeListRow {
  contact_id: string;
  currency: string;
  full_name: string | null;
  phone_number: string | null;
  /** numeric arrives as string from PostgREST — parse before display. */
  net_receivable: string;
  net_payable: string;
  /** ISO timestamp of the most recent activity for this contact+currency. */
  last_at: string | null;
  last_service_type: ContactServiceType | null;
  last_service_type_other: string | null;
  service_type_count: number;
}

export function useHomeList(enabled: boolean = true) {
  return useQuery({
    queryKey: HOME_LIST_KEY,
    enabled,
    // 30s is plenty — the user just made a transaction and pulled to refresh,
    // or it's been 30s since the last mutation invalidated us.
    staleTime: 30_000,
    queryFn: async (): Promise<HomeListRow[]> => {
      const { data, error } = await supabase
        .from('v_home_list')
        .select('*')
        .order('last_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as HomeListRow[];
    },
  });
}
