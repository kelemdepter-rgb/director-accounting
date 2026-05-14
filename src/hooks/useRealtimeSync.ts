import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

import { DEBTS_KEY } from './useDebts';
import { TRANSACTIONS_KEY } from './useTransactions';

const CONTACTS_KEY = ['contacts'] as const;
const SUMMARY_KEY = ['summary'] as const;

/**
 * Subscribe to Postgres change notifications for the four user-owned tables.
 * On any change we invalidate the matching TanStack Query caches so open
 * screens re-fetch the latest data — this is what makes a debt settled on
 * Phone show up on Web within a second.
 *
 * Pass `false` while no user is signed in so we don't open a socket.
 */
export function useRealtimeSync(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('director-accounting-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          void qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
          void qc.invalidateQueries({ queryKey: SUMMARY_KEY });
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' }, () => {
        void qc.invalidateQueries({ queryKey: DEBTS_KEY });
        void qc.invalidateQueries({ queryKey: SUMMARY_KEY });
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'debt_payments' },
        () => {
          void qc.invalidateQueries({ queryKey: DEBTS_KEY });
          void qc.invalidateQueries({ queryKey: SUMMARY_KEY });
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
        void qc.invalidateQueries({ queryKey: CONTACTS_KEY });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
}
