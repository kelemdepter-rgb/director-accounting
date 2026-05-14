import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { DebtWithBalanceRow, TransactionRow } from '@/types/database';
import { sumMoney } from '@/utils/currency';
import { todayRange } from '@/utils/date';
import { aggregateOutstandingByCurrency, type CurrencyTotals } from '@/utils/debtCalculation';

export interface DailySummary {
  /** Total income today, keyed by currency. */
  todayIncome: Record<string, number>;
  /** Total expense today, keyed by currency. */
  todayExpense: Record<string, number>;
  /** Outstanding active debts grouped by currency and side. */
  outstanding: Record<string, CurrencyTotals>;
}

/**
 * Aggregates today's transactions and active debts into the figures
 * shown on the Home dashboard. Cheap to refetch because the underlying
 * queries are tiny per-user.
 */
export function useSummary(enabled: boolean = true) {
  return useQuery({
    queryKey: ['summary', 'today'] as const,
    enabled,
    queryFn: async (): Promise<DailySummary> => {
      const { gte, lt } = todayRange();

      const [txnRes, debtRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('type,currency,amount')
          .gte('occurred_at', gte)
          .lt('occurred_at', lt),
        supabase
          .from('debts_with_balance')
          .select('type,status,currency,principal_amount,remaining_amount')
          .eq('status', 'active'),
      ]);

      if (txnRes.error) throw txnRes.error;
      if (debtRes.error) throw debtRes.error;

      const txns = (txnRes.data ?? []) as Pick<TransactionRow, 'type' | 'currency' | 'amount'>[];
      const debts = (debtRes.data ?? []) as DebtWithBalanceRow[];

      const todayIncome: Record<string, number> = {};
      const todayExpense: Record<string, number> = {};

      for (const t of txns) {
        const bucket = t.type === 'income' ? todayIncome : todayExpense;
        bucket[t.currency] = sumMoney([bucket[t.currency] ?? 0, t.amount]);
      }

      const outstanding = aggregateOutstandingByCurrency(debts);

      return { todayIncome, todayExpense, outstanding };
    },
  });
}
